# M.I.B Messenger (Message In Black)

Application de messagerie élégante avec chat et appels WebRTC.

## 🚀 Installation Locale

1. **Serveur (Backend)** :
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Client (Frontend)** :
   ```bash
   cd client
   npm install
   npm start
   ```

## 🌍 Déploiement

### Frontend (Netlify)
1. Allez sur Netlify.
2. Connectez votre repo GitHub ou glissez le dossier `client/build` (après avoir fait `npm run build`).

### Backend (Render / Railway)
1. Créez un nouveau "Web Service".
2. Connectez votre repo et pointez vers le dossier `server`.
3. Assurez-vous de mettre à jour l'URL du socket dans `App.js` avec l'URL de votre serveur déployé.

## 📁 Structure du projet
- `client/` : React + Tailwind CSS + PeerJS
- `server/` : Node.js + Socket.io + PeerServer
