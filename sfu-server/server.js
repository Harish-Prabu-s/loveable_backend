const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mediasoup = require('mediasoup');
const cors = require('cors');
const config = require('./config');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Mediasoup Workers & Room Management
const workers = [];
let nextWorkerIndex = 0;
const rooms = new Map(); // roomId => { router, participants: Map }
const peers = new Map(); // socket.id => { roomId, userId, transports, producers, consumers }

(async () => {
  const numWorkers = config.mediasoup.numWorkers;
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker(config.mediasoup.workerSettings);
    worker.on('died', () => {
      console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });
    workers.push(worker);
  }
  console.log(`Initialized ${numWorkers} mediasoup workers`);
})();

const getNextWorker = () => {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
};

io.on('connection', (socket) => {
  console.log('New client connection:', socket.id);
  
  // Track this connection's state
  peers.set(socket.id, {
    roomId: null,
    userId: null,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  });

  socket.on('joinRoom', async ({ roomId, userId, profileData }, callback) => {
    try {
      console.log(`User ${userId} joining room ${roomId}`);
      let room = rooms.get(roomId);
      if (!room) {
        const worker = getNextWorker();
        const router = await worker.createRouter(config.mediasoup.routerOptions);
        room = { router, participants: new Map() };
        rooms.set(roomId, room);
      }
      
      const peer = peers.get(socket.id);
      peer.roomId = roomId;
      peer.userId = userId;
      peer.profileData = profileData || {};

      room.participants.set(userId, { socketId: socket.id, producers: new Set() });
      socket.join(roomId);

      // Notify others
      socket.broadcast.to(roomId).emit('peerJoined', {
        userId,
        profileData: peer.profileData
      });

      // Send current peers to the joining user
      const currentPeers = [];
      for (const [pUserId, pData] of room.participants.entries()) {
        if (pUserId !== userId) {
          // get profile of the existing peer by finding its socket
          const pSocket = io.sockets.sockets.get(pData.socketId);
          if(pSocket) {
             const pPeerSession = peers.get(pSocket.id);
             currentPeers.push({ userId: pUserId, profileData: pPeerSession?.profileData || {} });
          }
        }
      }

      callback({ rtpCapabilities: room.router.rtpCapabilities, peers: currentPeers });
    } catch (error) {
      console.error('joinRoom error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('createWebRtcTransport', async ({ producing, consuming }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer.roomId) throw new Error('Not in a room');
      
      const room = rooms.get(peer.roomId);
      const transport = await room.router.createWebRtcTransport(config.mediasoup.webRtcTransportOptions);

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') transport.close();
      });

      transport.on('routerclose', () => transport.close());

      peer.transports.set(transport.id, transport);

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
    } catch (error) {
      console.error('createWebRtcTransport error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const peer = peers.get(socket.id);
      const transport = peer.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');
      
      await transport.connect({ dtlsParameters });
      callback();
    } catch (error) {
      console.error('connectTransport error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const peer = peers.get(socket.id);
      const transport = peer.transports.get(transportId);
      if (!transport) throw new Error('Transport not found');

      const producer = await transport.produce({ kind, rtpParameters, appData });
      
      peer.producers.set(producer.id, producer);
      const room = rooms.get(peer.roomId);
      room.participants.get(peer.userId).producers.add(producer.id);

      producer.on('transportclose', () => {
        producer.close();
        peer.producers.delete(producer.id);
        room.participants.get(peer.userId)?.producers.delete(producer.id);
      });

      callback({ id: producer.id });

      // Signal new producer to everyone in the room
      socket.broadcast.to(peer.roomId).emit('newProducer', {
        producerId: producer.id,
        userId: peer.userId,
        kind: producer.kind,
        appData: producer.appData
      });
    } catch (error) {
      console.error('produce error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('consume', async ({ producerId, rtpCapabilities, transportId }, callback) => {
    try {
      const peer = peers.get(socket.id);
      const room = rooms.get(peer.roomId);
      const transport = peer.transports.get(transportId);

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Router cannot consume this producer');
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Always start paused as per mediasoup guidelines
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

      callback({
        params: {
          id: consumer.id,
          producerId: producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        },
      });
    } catch (error) {
      console.error('consume error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('resumeConsumer', async ({ consumerId }, callback) => {
    try {
      const peer = peers.get(socket.id);
      const consumer = peer.consumers.get(consumerId);
      if (!consumer) throw new Error('Consumer not found');
      
      await consumer.resume();
      callback();
    } catch (error) {
      console.error('resumeConsumer error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('chatMessage', (data) => {
    const peer = peers.get(socket.id);
    if (peer.roomId) {
      socket.broadcast.to(peer.roomId).emit('chatMessage', {
        userId: peer.userId,
        text: data.text,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const peer = peers.get(socket.id);
    
    if (peer && peer.roomId) {
      const room = rooms.get(peer.roomId);
      
      // Clean up transports, producers, and consumers
      for (const transport of peer.transports.values()) transport.close();
      
      // Notify others
      socket.broadcast.to(peer.roomId).emit('peerLeft', { userId: peer.userId });
      
      if (room) {
        room.participants.delete(peer.userId);
        // If room is empty, clean it up
        if (room.participants.size === 0) {
          console.log(`Closing empty room ${peer.roomId}`);
          room.router.close();
          rooms.delete(peer.roomId);
        }
      }
    }
    peers.delete(socket.id);
  });
});

const PORT = config.listenPort || 3000;
server.listen(PORT, () => {
  console.log(`Enterprise SFU Server running on port ${PORT}`);
});
