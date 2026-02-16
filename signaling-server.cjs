const WebSocket = require("ws");

const port = 9000;
const server = new WebSocket.Server({ port });

const rooms = new Map();

server.on("connection", (socket, req) => {
  try {
    const url = new URL(req.url, "ws://localhost");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || parts[0] !== "call") {
      socket.close();
      return;
    }
    const roomId = parts[1];
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const peers = rooms.get(roomId);
    peers.add(socket);

    socket.on("message", (data) => {
      for (const peer of peers) {
        if (peer !== socket && peer.readyState === WebSocket.OPEN) {
          peer.send(data);
        }
      }
    });

    socket.on("close", () => {
      peers.delete(socket);
      if (peers.size === 0) {
        rooms.delete(roomId);
      }
    });

    socket.on("error", () => {});
  } catch {
    socket.close();
  }
});

