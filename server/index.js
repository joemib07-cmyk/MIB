const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // En production, spécifiez l'URL Netlify
    methods: ["GET", "POST"]
  }
});

// Serveur PeerJS pour le WebRTC
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/mibaudiovideo'
});

app.use('/peerjs', peerServer);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Rejoindre une "room" spécifique
  socket.on('join_room', (data) => {
    socket.join(data.room);
    users.set(socket.id, data.username);
    console.log(`User ${data.username} (${socket.id}) joined room: ${data.room}`);
  });

  // Envoi de message
  socket.on('send_message', (data) => {
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`M.I.B Server running on port ${PORT}`);
});
