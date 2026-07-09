# Projet : Création d'une application de messagerie (Style WhatsApp)

Ce document décrit le plan initial pour créer une application de messagerie en temps réel à des fins d'apprentissage.

## 1. Architecture Technique Recommandée (Tech Stack)

Pour un projet d'apprentissage moderne et efficace, voici la pile technologique suggérée :

*   **Frontend** : **React.js** (hébergé sur **Netlify**).
*   **Backend** : **Node.js** avec **Express** (hébergé sur **Render** ou **Railway**).
*   **Temps réel (Chat)** : **Socket.io**.
*   **Appels (Audio/Vidéo)** : **WebRTC** avec la bibliothèque **PeerJS**.
*   **Base de données** : **MongoDB Atlas** (Cloud).

## 2. Fonctionnalités du Produit Minimum Viable (MVP)

1.  **Authentification** : Inscription et connexion.
2.  **Messagerie Instantanée** : Chat en temps réel.
3.  **Appels Vidéo/Audio** : Lancer un appel direct depuis une conversation.
4.  **Indicateurs d'état** : En ligne, en train d'écrire.

## 3. Prochaines étapes

1.  **Configuration de l'environnement** : Installation de Node.js, création des dossiers `client` et `server`.
2.  **Initialisation du serveur** : Mise en place d'un serveur Express de base avec Socket.io.
3.  **Création de l'interface** : Développement de la page de chat avec React.
