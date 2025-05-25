const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*', // Change this to your frontend URL on production
  methods: ['GET', 'POST']
}));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Change this accordingly
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5003;

io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  socket.on('register', (viewerId) => {
    socket.viewerId = viewerId;
    console.log(`Viewer registered: ${viewerId}`);
  });

  socket.on('start-sharing', (viewerId) => {
    console.log(`Start sharing requested for: ${viewerId}`);
    io.emit('start-viewing', { channel: viewerId });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
