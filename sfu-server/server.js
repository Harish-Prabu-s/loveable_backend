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

// Mediasoup Workers
const workers = [];
let nextWorkerIndex = 0;

// Room management
// rooms = { roomId: { router, participants: { userId: { producerId: { producer }, consumers: [] } } } }
const rooms = new Map();

(async () => {
  // Create laborers
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

  socket.on('getRouterRtpCapabilities', async (data, callback) => {
    try {
      const { roomId } = data;
      let room = rooms.get(roomId);
      if (!room) {
        const worker = getNextWorker();
        const router = await worker.createRouter(config.mediasoup.routerOptions);
        room = { router, participants: new Map() };
        rooms.set(roomId, room);
      }
      callback({ rtpCapabilities: room.router.rtpCapabilities });
    } catch (error) {
      console.error('getRouterRtpCapabilities error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('createWebRtcTransport', async (data, callback) => {
    try {
      const { roomId, userId } = data;
      const room = rooms.get(roomId);
      if (!room) throw new Error('Room not found');

      const transport = await room.router.createWebRtcTransport(config.mediasoup.webRtcTransportOptions);

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') transport.close();
      });

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });

      // Store transport loosely for now (real production apps use more robust state)
      socket.transport = transport;
    } catch (error) {
      console.error('createWebRtcTransport error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('connectTransport', async (data, callback) => {
    try {
      const { transportId, dtlsParameters } = data;
      await socket.transport.connect({ dtlsParameters });
      callback();
    } catch (error) {
      console.error('connectTransport error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('produce', async (data, callback) => {
    try {
      const { kind, rtpParameters, roomId, userId } = data;
      const producer = await socket.transport.produce({ kind, rtpParameters });
      
      const room = rooms.get(roomId);
      let participant = room.participants.get(userId);
      if (!participant) {
        participant = { producers: new Map(), consumers: new Map() };
        room.participants.set(userId, participant);
      }
      participant.producers.set(producer.id, producer);

      callback({ id: producer.id });

      // Signal new producer to others
      socket.broadcast.to(roomId).emit('newProducer', { producerId: producer.id, userId });
    } catch (error) {
      console.error('produce error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('consume', async (data, callback) => {
    try {
      const { roomId, userId, producerId, rtpCapabilities } = data;
      const room = rooms.get(roomId);
      const router = room.router;

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Cannot consume');
      }

      const consumer = await socket.transport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      consumer.on('transportclose', () => {
        consumer.close();
      });

      callback({
        params: {
          id: consumer.id,
          producerId: producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        },
      });
      
      // Resume consumer
      socket.on('resumeConsumer', async () => {
          await consumer.resume();
      });

    } catch (error) {
      console.error('consume error:', error);
      callback({ error: error.message });
    }
  });

  socket.on('joinRoom', ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = config.listenPort || 3000;
server.listen(PORT, () => {
  console.log(`SFU Server running on port ${PORT}`);
});
