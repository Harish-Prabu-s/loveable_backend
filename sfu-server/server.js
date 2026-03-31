'use strict';

const express   = require('express');
const http      = require('http');
const socketIo  = require('socket.io');
const mediasoup = require('mediasoup');
const cors      = require('cors');
const jwt       = require('jsonwebtoken');
const config    = require('./config');

require('dotenv').config();

// ─────────────────────────────────────────────────────────────────────────────
// App & HTTP server
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);

// Health check — used by load balancers / Kubernetes liveness probes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    workers: workers.length,
    rooms: rooms.size,
    peers: peers.size,
    uptime: process.uptime(),
  });
});

// Worker stats — useful for Prometheus scraping
app.get('/metrics', (_req, res) => {
  const workerUsage = workers.map((w, i) => ({
    index: i,
    pid: w.pid,
    rooms: [...rooms.values()].filter(r => r.workerPid === w.pid).length,
  }));
  res.json({ workers: workerUsage, totalRooms: rooms.size, totalPeers: peers.size });
});

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO server
// ─────────────────────────────────────────────────────────────────────────────
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket'],   // Force WebSocket — no long-polling fallback
  pingInterval: 25000,
  pingTimeout:  20000,
});

// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication middleware for Socket.IO
// ─────────────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.DJANGO_SECRET_KEY || process.env.JWT_SECRET || 'dev-secret-key';

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    console.warn(`[SFU Auth] REJECTED: No token. Socket: ${socket.id}`);
    return next(new Error('Authentication required'));
  }

  try {
    // Django SimpleJWT uses HS256 with user_id claim by default
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    socket.data.userId = String(payload.user_id || payload.sub || payload.id);
    console.log(`[SFU Auth] ACCEPTED: userId=${socket.data.userId} socket=${socket.id}`);
    next();
  } catch (err) {
    console.warn(`[SFU Auth] REJECTED: Invalid token. Error: ${err.message}`);
    next(new Error('Invalid token'));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
const workers = [];
let nextWorkerIdx = 0;

// roomId → { router, participants: Map<userId, {socketId, producers: Set}>, workerPid }
const rooms = new Map();

// socket.id → { roomId, userId, transports: Map, producers: Map, consumers: Map, profileData }
const peers = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Worker management — auto-restart instead of crashing on worker death
// ─────────────────────────────────────────────────────────────────────────────
async function createWorker(index) {
  const worker = await mediasoup.createWorker(config.mediasoup.workerSettings);

  worker.on('died', async () => {
    console.error(`[mediasoup] Worker[${index}] (pid:${worker.pid}) died — restarting in 2s`);
    // Remove dead worker from list
    workers[index] = null;

    // Clean up rooms that were on this worker
    for (const [roomId, room] of rooms.entries()) {
      if (room.workerPid === worker.pid) {
        console.warn(`[mediasoup] Closing room ${roomId} because its worker died`);
        try { room.router.close(); } catch {}
        rooms.delete(roomId);
      }
    }

    // Restart the worker after a brief delay
    setTimeout(async () => {
      try {
        workers[index] = await createWorker(index);
        console.log(`[mediasoup] Worker[${index}] restarted (pid:${workers[index].pid})`);
      } catch (e) {
        console.error(`[mediasoup] Worker[${index}] restart failed:`, e);
      }
    }, 2000);
  });

  return worker;
}

(async () => {
  const numWorkers = config.mediasoup.numWorkers;
  for (let i = 0; i < numWorkers; i++) {
    workers.push(await createWorker(i));
  }
  console.log(`[mediasoup] ${numWorkers} workers started`);
})();

const getNextWorker = () => {
  // Round-robin: skip null/dead workers
  let attempts = 0;
  while (attempts < workers.length) {
    const worker = workers[nextWorkerIdx];
    nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
    if (worker) return worker;
    attempts++;
  }
  throw new Error('No mediasoup workers available');
};

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO event handlers
// ─────────────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`[SFU] Client connected: socket=${socket.id} userId=${userId}`);

  peers.set(socket.id, {
    roomId:      null,
    userId,
    transports:  new Map(),
    producers:   new Map(),
    consumers:   new Map(),
    profileData: {},
  });

  // ── joinRoom ──────────────────────────────────────────────────────────────
  socket.on('joinRoom', async ({ roomId, profileData }, callback) => {
    try {
      if (!roomId) throw new Error('roomId required');

      console.log(`[SFU] User ${userId} joining room ${roomId}`);

      let room = rooms.get(String(roomId));
      if (!room) {
        const worker = getNextWorker();
        const router = await worker.createRouter(config.mediasoup.routerOptions);
        room = { router, participants: new Map(), workerPid: worker.pid };
        rooms.set(String(roomId), room);
        console.log(`[SFU] Room ${roomId} created on worker pid=${worker.pid}`);
      }

      // Enforce max participant limit (configurable)
      const maxParticipants = config.maxParticipantsPerRoom || 25;
      if (room.participants.size >= maxParticipants) {
        throw new Error(`Room ${roomId} is full (max ${maxParticipants} participants)`);
      }

      const peer = peers.get(socket.id);
      peer.roomId = String(roomId);
      peer.profileData = profileData || {};
      room.participants.set(userId, { socketId: socket.id, producers: new Set() });
      socket.join(String(roomId));

      // Notify existing participants
      socket.broadcast.to(String(roomId)).emit('peerJoined', {
        userId,
        profileData: peer.profileData,
      });

      // Send existing participants to the joiner
      const currentPeers = [];
      for (const [pUserId, pData] of room.participants.entries()) {
        if (pUserId !== userId) {
          const pPeer = peers.get(pData.socketId);
          if (pPeer) {
            currentPeers.push({
              userId:      pUserId,
              profileData: pPeer.profileData || {},
            });
          }
        }
      }

      callback({ rtpCapabilities: room.router.rtpCapabilities, peers: currentPeers });
    } catch (error) {
      console.error('[SFU] joinRoom error:', error.message);
      callback({ error: error.message });
    }
  });

  // ── createWebRtcTransport ─────────────────────────────────────────────────
  socket.on('createWebRtcTransport', async ({ producing, consuming }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer?.roomId) throw new Error('Not in a room');

      const room      = rooms.get(peer.roomId);
      const transport = await room.router.createWebRtcTransport(
        config.mediasoup.webRtcTransportOptions
      );

      transport.on('dtlsstatechange', (state) => {
        if (state === 'closed') transport.close();
      });
      transport.on('routerclose', () => transport.close());

      peer.transports.set(transport.id, transport);

      callback({
        params: {
          id:             transport.id,
          iceParameters:  transport.iceParameters,
          iceCandidates:  transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          sctpParameters: transport.sctpParameters,
        },
      });
    } catch (error) {
      console.error('[SFU] createWebRtcTransport error:', error.message);
      callback({ error: error.message });
    }
  });

  // ── connectTransport ──────────────────────────────────────────────────────
  socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const peer      = peers.get(socket.id);
      const transport = peer?.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');

      await transport.connect({ dtlsParameters });
      callback();
    } catch (error) {
      console.error('[SFU] connectTransport error:', error.message);
      callback({ error: error.message });
    }
  });

  // ── produce ───────────────────────────────────────────────────────────────
  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const peer      = peers.get(socket.id);
      const transport = peer?.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');

      const producer = await transport.produce({ kind, rtpParameters, appData });

      peer.producers.set(producer.id, producer);

      const room = rooms.get(peer.roomId);
      room.participants.get(userId)?.producers.add(producer.id);

      producer.on('transportclose', () => {
        producer.close();
        peer.producers.delete(producer.id);
        room.participants.get(userId)?.producers.delete(producer.id);
      });

      // Adaptive bitrate — enable simulcast score monitoring
      producer.on('score', (scores) => {
        console.log(`[SFU] Producer ${producer.id} scores:`, JSON.stringify(scores));
      });

      callback({ id: producer.id });

      // Announce new producer to everyone else in the room
      socket.broadcast.to(peer.roomId).emit('newProducer', {
        producerId: producer.id,
        userId:     peer.userId,
        kind:       producer.kind,
        appData:    producer.appData,
      });
    } catch (error) {
      console.error('[SFU] produce error:', error.message);
      callback({ error: error.message });
    }
  });

  // ── consume ───────────────────────────────────────────────────────────────
  socket.on('consume', async ({ producerId, rtpCapabilities, transportId }, callback) => {
    try {
      const peer      = peers.get(socket.id);
      const room      = rooms.get(peer?.roomId);
      const transport = peer?.transports.get(transportId);

      if (!room || !transport) throw new Error('Room or transport not found');

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Cannot consume this producer (codec mismatch)');
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Always start paused — resume after 'resume-consumer' event
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
        socket.emit('consumerClosed', { consumerId: consumer.id });
      });

      // Bandwidth-based layer switching (simulcast)
      consumer.on('layerschange', (layers) => {
        console.log(`[SFU] Consumer ${consumer.id} layers:`, layers);
      });

      callback({
        params: {
          id:            consumer.id,
          producerId,
          kind:          consumer.kind,
          rtpParameters: consumer.rtpParameters,
        },
      });
    } catch (error) {
      console.error('[SFU] consume error:', error.message);
      callback({ error: error.message });
    }
  });

  // ── resumeConsumer ────────────────────────────────────────────────────────
  socket.on('resumeConsumer', async ({ consumerId }, callback) => {
    try {
      const peer     = peers.get(socket.id);
      const consumer = peer?.consumers.get(consumerId);
      if (!consumer) throw new Error('Consumer not found');

      await consumer.resume();
      callback();
    } catch (error) {
      console.error('[SFU] resumeConsumer error:', error.message);
      callback({ error: error.message });
    }
  });

  // ── getProducers (for late joiners) ──────────────────────────────────────
  socket.on('getProducers', (callback) => {
    const peer = peers.get(socket.id);
    if (!peer?.roomId) return callback({ producers: [] });

    const room      = rooms.get(peer.roomId);
    const producers = [];

    for (const [pUserId, pData] of room.participants.entries()) {
      if (pUserId === userId) continue;
      const pPeer = peers.get(pData.socketId);
      if (!pPeer) continue;

      for (const [producerId, producer] of pPeer.producers.entries()) {
        producers.push({
          producerId,
          userId: pUserId,
          kind:   producer.kind,
          appData: producer.appData,
        });
      }
    }

    callback({ producers });
  });

  // ── chatMessage ───────────────────────────────────────────────────────────
  socket.on('chatMessage', (data) => {
    const peer = peers.get(socket.id);
    if (peer?.roomId) {
      socket.broadcast.to(peer.roomId).emit('chatMessage', {
        userId: peer.userId,
        text:   data.text,
        timestamp: Date.now(),
      });
    }
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[SFU] Client disconnected: socket=${socket.id} userId=${userId} reason=${reason}`);

    const peer = peers.get(socket.id);
    if (peer?.roomId) {
      const room = rooms.get(peer.roomId);

      // Close all transports (which closes producers and consumers too)
      for (const transport of peer.transports.values()) {
        try { transport.close(); } catch {}
      }

      // Notify others
      socket.broadcast.to(peer.roomId).emit('peerLeft', { userId: peer.userId });

      if (room) {
        room.participants.delete(userId);
        if (room.participants.size === 0) {
          console.log(`[SFU] Room ${peer.roomId} is empty — closing router`);
          try { room.router.close(); } catch {}
          rooms.delete(peer.roomId);
        }
      }
    }

    peers.delete(socket.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const PORT = config.listenPort || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SFU] Enterprise mediasoup server running on port ${PORT}`);
});
