# Guide de Déploiement Réel - M.I.B

Pour que **M.I.B** fonctionne en ligne, nous allons séparer le "Corps" (Frontend) et le "Cerveau" (Backend).

## 1. Déploiement du Cerveau (Backend) sur Render.com
*Pourquoi ?* Netlify ne supporte pas les serveurs persistants (WebSockets).

1. Créez un compte sur [Render.com](https://render.com).
2. Cliquez sur **New +** > **Web Service**.
3. Connectez votre dépôt GitHub.
4. Paramètres :
   - **Root Directory** : `server`
   - **Build Command** : `npm install`
   - **Start Command** : `node index.js`
5. Une fois déployé, notez l'URL (ex: `https://mib-backend.onrender.com`).

## 2. Déploiement du Corps (Frontend) sur Netlify
1. Créez un compte sur [Netlify.com](https://netlify.com).
2. Cliquez sur **Add new site** > **Import an existing project**.
3. Connectez votre dépôt GitHub.
4. Paramètres :
   - **Base directory** : `client`
   - **Build command** : `npm run build`
   - **Publish directory** : `client/build`
5. **CRUCIAL** : Allez dans *Site configuration* > *Environment variables* et ajoutez :
   - `REACT_APP_BACKEND_URL` : [URL de votre serveur Render]
   - `REACT_APP_PEER_HOST` : [Nom de domaine Render, ex: mib-backend.onrender.com]
   - `REACT_APP_PEER_PORT` : `443`
   - `REACT_APP_PEER_SECURE` : `true`

## 3. Lier les deux
Une fois les deux services en ligne, votre application M.I.B sera accessible partout dans le monde via votre URL Netlify !
