import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';
import { Send, Phone, Video, User, Shield, Circle, LogIn } from 'lucide-react';

const socket = io.connect('http://localhost:3001');

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('Général');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [myPeerId, setMyPeerId] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  
  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    if (!isLoggedIn) return;

    const peer = new Peer(undefined, {
      host: process.env.REACT_APP_PEER_HOST || 'localhost',
      port: process.env.REACT_APP_PEER_PORT || 3001,
      path: '/peerjs',
      secure: process.env.REACT_APP_PEER_SECURE === 'true'
    });

    peer.on('open', (id) => {
      setMyPeerId(id);
      socket.emit('join_room', { room, username });
    });

    peer.on('call', (call) => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        myVideoRef.current.srcObject = stream;
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          remoteVideoRef.current.srcObject = remoteStream;
        });
      });
    });

    peerRef.current = peer;

    socket.on('receive_message', (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => {
      socket.off('receive_message');
      peer.destroy();
    };
  }, [isLoggedIn, room, username]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() !== "") {
      setIsLoggedIn(true);
    }
  };

  const sendMessage = () => {
    if (message !== '') {
      const messageData = {
        room,
        author: username,
        message,
        time: new Date().toLocaleTimeString(),
      };
      socket.emit('send_message', messageData);
      setChat((prev) => [...prev, messageData]);
      setMessage('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <Shield className="w-10 h-10 text-black" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white tracking-tighter">M.I.B ACCESS</h1>
              <p className="text-zinc-500 text-sm mt-1">Identifiez-vous pour accéder au réseau</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Nom d'agent</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ex: Agent Alpha" 
                  className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-12 text-white focus:outline-none focus:border-white transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <User className="w-5 h-5 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group"
            >
              Initialiser la session
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800 text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Connexion sécurisée bout-en-bout</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 text-white">
          <Shield className="w-8 h-8 text-zinc-400" />
          <h1 className="text-2xl font-bold tracking-tighter">M.I.B</h1>
        </div>
        
        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Canaux</p>
          <button className="flex items-center gap-2 bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            # général
          </button>
        </div>

        <div className="mt-auto flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{username}</p>
            <p className="text-xs text-zinc-500">ID: {myPeerId.slice(0, 6)}</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-white font-semibold"># général</h2>
            <p className="text-xs text-zinc-500">Canal sécurisé crypté</p>
          </div>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsCalling(true)}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
          {chat.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.author === username ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-zinc-500 mb-1 ml-1 uppercase tracking-tighter">{msg.author}</div>
              <div className={`max-w-md p-4 rounded-2xl ${msg.author === username ? 'bg-white text-black rounded-tr-none' : 'bg-zinc-800 text-white border border-zinc-700 rounded-tl-none'}`}>
                <p className="text-sm">{msg.message}</p>
              </div>
              <span className="text-[10px] text-zinc-600 mt-1 uppercase tracking-tighter">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-black">
          <div className="max-w-4xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Écrire un message crypté..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 pr-16 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-600"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Video Overlay */}
      {isCalling && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
              <video ref={myVideoRef} autoPlay muted className="rounded-3xl border-2 border-zinc-800 bg-zinc-900 w-full aspect-video object-cover" />
              <video ref={remoteVideoRef} autoPlay className="rounded-3xl border-2 border-zinc-500 bg-zinc-900 w-full aspect-video object-cover" />
           </div>
           <button 
             onClick={() => setIsCalling(false)}
             className="mt-10 px-8 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700"
           >
             Terminer l'appel
           </button>
        </div>
      )}
    </div>
  );
}

export default App;
