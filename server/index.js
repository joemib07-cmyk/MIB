const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const crypto = require('crypto');

const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const AGENTS_FILE = path.join(__dirname, 'agents.json');

// Charger les agents depuis le fichier
let AUTHORIZED_AGENTS = {};
try {
  if (fs.existsSync(AGENTS_FILE)) {
    AUTHORIZED_AGENTS = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8'));
  } else {
    AUTHORIZED_AGENTS = { "KARIM-ADMIN": "Agent Karim (Admin)" };
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(AUTHORIZED_AGENTS, null, 2));
  }
} catch (err) {
  AUTHORIZED_AGENTS = { "KARIM-ADMIN": "Agent Karim (Admin)" };
}

const saveAgents = () => {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(AUTHORIZED_AGENTS, null, 2));
};

const users = new Map();

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
});

app.use('/peerjs', peerServer);

io.on('connection', (socket) => {
  // Tentative de connexion (Auto via lien ou Manuel)
  socket.on('join_room', (data) => {
    const agentName = AUTHORIZED_AGENTS[data.agentId];
    console.log(`Tentative de connexion: ID=${data.agentId}, Nom=${agentName}`);
    if (agentName) {
      socket.join(data.room);
      const isAdmin = data.agentId === "KARIM-ADMIN";
      // On stocke l'utilisateur
      users.set(socket.id, { 
        username: agentName, 
        agentId: data.agentId, 
        peerId: null 
      });
      socket.emit('auth_success', { 
        username: agentName,
        isAdmin: isAdmin
      });
      console.log(`Agent ${agentName} connecté (Admin: ${isAdmin})`);
      
      io.to(data.room).emit('update_user_list', Array.from(users.values()));
    } else {
      console.log(`Connexion refusée: ID=${data.agentId} inconnu`);
      socket.emit('auth_error', { message: "ID Agent invalide." });
    }
  });

  // Mise à jour du PeerID quand PeerJS est prêt
  socket.on('update_peer_id', (data) => {
    const user = users.get(socket.id);
    if (user) {
      user.peerId = data.peerId;
      io.emit('update_user_list', Array.from(users.values()));
    }
  });

  // Action Admin : Créer une invitation
  socket.on('create_invite', (data) => {
    const user = users.get(socket.id);
    if (user && user.agentId === "KARIM-ADMIN") {
      const newId = crypto.randomBytes(4).toString('hex').toUpperCase();
      AUTHORIZED_AGENTS[newId] = data.name;
      saveAgents();
      socket.emit('invite_created', { id: newId, name: data.name });
    }
  });

  // Action Admin : Supprimer un agent
  socket.on('delete_agent', (data) => {
    const user = users.get(socket.id);
    if (user && user.agentId === "KARIM-ADMIN") {
      if (data.agentId !== "KARIM-ADMIN") {
        delete AUTHORIZED_AGENTS[data.agentId];
        saveAgents();
        
        // Trouver et déconnecter l'agent s'il est en ligne
        for (const [sid, u] of users.entries()) {
          if (u.agentId === data.agentId) {
            const targetSocket = io.sockets.sockets.get(sid);
            if (targetSocket) {
              targetSocket.emit('auth_error', { message: "Votre accès a été révoqué." });
              targetSocket.disconnect();
            }
          }
        }
        
        socket.emit('agent_deleted', { agentId: data.agentId });
        io.emit('update_user_list', Array.from(users.values()));
      }
    }
  });

  socket.on('send_message', (data) => {
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('update_user_list', Array.from(users.values()));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`M.I.B Secure Server running on port ${PORT}`);
});
