const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5003;

const connectedUsers = {}; // userId => socket
const emailToSocketMap = new Map(); // email => socket.id
let ongoingScreenShares = []; // Store current active screen shares
const operatorSessions = new Map(); // viewerId => operatorId mapping

// ✅ Helper function to extract clean operator ID
function extractOperatorId(userId) {
  // Remove suffixes like "_admin", "_operator", etc.
  if (userId && userId.includes('_')) {
    return userId.split('_')[0];
  }
  return userId;
}

io.on('connection', (socket) => {
  console.log('✅ New socket connected:', socket.id);

  // 🔐 Register user with ID and role
  socket.on('register', ({ userId, role }) => {
    const cleanUserId = extractOperatorId(userId);
    socket.userId = cleanUserId;
    socket.originalUserId = userId; // Keep original for reference
    socket.role = role;
    connectedUsers[cleanUserId] = socket;
    
    console.log(`🧾 Registered ${role}: ${cleanUserId} (original: ${userId})`);

    // 📺 If admin logs in late, notify them of all ongoing shares
    if (role === 'admin') {
      ongoingScreenShares.forEach(({ viewerId, operatorId, originalOperatorId }) => {
        socket.emit('start-sharing', { 
          viewerId, 
          operatorId: operatorId, // Send the clean operator ID
          originalOperatorId: originalOperatorId // Keep original for reference
        });
        console.log(`🔁 Replayed screen share to admin for viewer ${viewerId} with operator ${operatorId}`);
      });
    }
  });

  // 🚀 Operator starts screen sharing
  socket.on('start-sharing', ({ viewerId, operatorId }) => {
    // Extract clean operator ID if it contains suffixes
    const cleanOperatorId = extractOperatorId(operatorId);
    
    console.log(`📡 Operator ${cleanOperatorId} (original: ${operatorId}) is sharing screen with viewer ${viewerId}`);

    const viewerSocket = connectedUsers[viewerId];
    if (viewerSocket) {
      viewerSocket.emit('start-viewing', { 
        channel: viewerId, 
        operatorId: cleanOperatorId,
        originalOperatorId: operatorId
      });
      console.log(`✅ Viewer ${viewerId} notified.`);
    } else {
      console.warn(`⚠️ Viewer ${viewerId} not connected`);
    }

    // 📦 Store this screen sharing session with clean operator ID
    const sessionData = { 
      viewerId, 
      operatorId: cleanOperatorId,
      originalOperatorId: operatorId,
      startTime: new Date().toISOString()
    };
    
    // Remove any existing session for this viewer
    ongoingScreenShares = ongoingScreenShares.filter(
      (entry) => entry.viewerId !== viewerId
    );
    
    // Add new session
    ongoingScreenShares.push(sessionData);
    operatorSessions.set(viewerId, cleanOperatorId);

    // 👮 Notify admin with clean operator ID
    for (let userId in connectedUsers) {
      const sock = connectedUsers[userId];
      if (sock.role === 'admin') {
        sock.emit('start-sharing', { 
          viewerId, 
          operatorId: cleanOperatorId,
          originalOperatorId: operatorId
        });
        console.log(`👮 Admin ${userId} notified of screen share by operator ${cleanOperatorId}`);
      }
    }
  });

  // ✅ Viewer registers their email (WebRTC)
  socket.on('viewer-register', ({ email }) => {
    emailToSocketMap.set(email, socket.id);
    console.log(`🎥 Viewer registered: ${email} -> ${socket.id}`);
  });

  // ✅ Operator checks if viewer is available
  socket.on('check-viewer-email', ({ email }) => {
    const viewerSocketId = emailToSocketMap.get(email);
    if (viewerSocketId) {
      socket.emit('viewer-verified', { viewerId: viewerSocketId });
    } else {
      socket.emit('viewer-not-found');
    }
  });

  // ✅ WebRTC: Offer, Answer, and ICE
  socket.on('offer', ({ to, offer }) => {
    const operatorId = operatorSessions.get(to) || extractOperatorId(socket.userId);
    io.to(to).emit('offer', { 
      offer, 
      from: socket.id,
      operatorId: operatorId // Include operator ID in offer
    });
    console.log(`📤 Offer sent from ${operatorId} to ${to}`);
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { candidate });
  });

  // ❌ Stop sharing
  socket.on('stop-sharing', ({ viewerId }) => {
    io.to(viewerId).emit('stop-sharing');
    
    // Remove from ongoing sessions
    ongoingScreenShares = ongoingScreenShares.filter(
      (entry) => entry.viewerId !== viewerId
    );
    
    // Remove from operator sessions
    operatorSessions.delete(viewerId);
    
    console.log(`🛑 Screen sharing stopped for viewer ${viewerId}`);

    // Notify admin that sharing stopped
    for (let userId in connectedUsers) {
      const sock = connectedUsers[userId];
      if (sock.role === 'admin') {
        sock.emit('stop-sharing', { viewerId });
      }
    }
  });

  // 🔌 Disconnect handling
  socket.on('disconnect', () => {
    const cleanUserId = socket.userId;
    const originalUserId = socket.originalUserId;
    
    if (cleanUserId && connectedUsers[cleanUserId]) {
      delete connectedUsers[cleanUserId];
      console.log(`❌ Disconnected: ${cleanUserId} (original: ${originalUserId})`);
    }

    // Remove email mapping
    for (let [email, id] of emailToSocketMap.entries()) {
      if (id === socket.id) {
        emailToSocketMap.delete(email);
        console.log(`🗑️ Removed email mapping for: ${email}`);
        break;
      }
    }

    // Remove any ongoing screen shares initiated by this socket
    const removedSessions = ongoingScreenShares.filter(
      (entry) => entry.operatorId === cleanUserId || entry.originalOperatorId === originalUserId
    );
    
    ongoingScreenShares = ongoingScreenShares.filter(
      (entry) => entry.operatorId !== cleanUserId && entry.originalOperatorId !== originalUserId
    );

    // Remove from operator sessions
    for (let [viewerId, operatorId] of operatorSessions.entries()) {
      if (operatorId === cleanUserId) {
        operatorSessions.delete(viewerId);
      }
    }

    // Notify admin of disconnected sessions
    if (removedSessions.length > 0) {
      for (let userId in connectedUsers) {
        const sock = connectedUsers[userId];
        if (sock.role === 'admin') {
          removedSessions.forEach(session => {
            sock.emit('stop-sharing', { viewerId: session.viewerId });
          });
        }
      }
    }

    console.log('❌ Socket disconnected:', socket.id);
  });

  // 📊 Debug endpoint to check active sessions
  socket.on('get-active-sessions', () => {
    if (socket.role === 'admin') {
      socket.emit('active-sessions', {
        ongoingScreenShares,
        connectedUsers: Object.keys(connectedUsers),
        operatorSessions: Array.from(operatorSessions.entries())
      });
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log('📊 Debug: Server initialized with clean operator ID extraction');
});
