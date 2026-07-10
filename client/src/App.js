import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';
import { Send, Phone, Video, User, Shield, Circle, LogIn, UserPlus, Copy, Check, Trash2, Settings, X, Bell, Moon, LogOut } from 'lucide-react';

const socket = io.connect(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001');

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [room, setRoom] = useState('Général');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [myPeerId, setMyPeerId] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState('video'); // 'video' or 'audio'
  const [showSettings, setShowSettings] = useState(false);
  
  // States pour les invitations
  const [inviteName, setInviteName] = useState('');
  const [lastInviteUrl, setLastInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();

  useEffect(() => {
    // 1. Vérifier si un ID est présent dans l'URL pour l'auto-connexion
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('id');
    if (idFromUrl) {
      setAgentId(idFromUrl);
      socket.emit('join_room', { room: 'Général', agentId: idFromUrl });
    }

    socket.on('auth_success', (data) => {
      setUsername(data.username);
      setIsAdmin(data.isAdmin);
      setIsLoggedIn(true);
      setError('');
    });

    socket.on('auth_error', (data) => {
      setError(data.message);
      setIsLoggedIn(false);
    });

    socket.on('invite_created', (data) => {
      const url = `${window.location.origin}/?id=${data.id}`;
      setLastInviteUrl(url);
    });

    socket.on('update_user_list', (users) => {
      setActiveUsers(users);
    });

    socket.on('all_agents', (agents) => {
      setAllAgents(agents);
    });

    socket.on('receive_message', (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on('agent_deleted', (data) => {
      if (isAdmin) {
        setLastInviteUrl('');
      }
    });

    return () => {
      socket.off('auth_success');
      socket.off('auth_error');
      socket.off('invite_created');
      socket.off('update_user_list');
      socket.off('all_agents');
      socket.off('receive_message');
      socket.off('agent_deleted');
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Configuration PeerJS
    const peer = new Peer(undefined, {
      host: process.env.REACT_APP_PEER_HOST || window.location.hostname,
      port: process.env.REACT_APP_PEER_PORT || (window.location.hostname === 'localhost' ? 3001 : (window.location.port || (window.location.protocol === 'https:' ? 443 : 80))),
      path: '/peerjs',
      secure: window.location.protocol === 'https:' || process.env.REACT_APP_PEER_SECURE === 'true'
    });

    peer.on('open', (id) => {
      setMyPeerId(id);
      socket.emit('update_peer_id', { peerId: id });
    });

    peer.on('call', (call) => {
      const isVideoCall = call.options?.metadata?.type !== 'audio';
      setCallType(isVideoCall ? 'video' : 'audio');
      setIsCalling(true);
      
      navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true }).then((stream) => {
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
      }).catch(err => {
        console.error("Failed to get local stream", err);
      });
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (agentId.trim() !== "") {
      socket.emit('join_room', { room, agentId });
    }
  };

  const createInvite = (e) => {
    e.preventDefault();
    if (inviteName.trim() !== "") {
      socket.emit('create_invite', { name: inviteName });
      setInviteName('');
    }
  };

  const deleteAgent = (idToDelete) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet agent ?")) {
      socket.emit('delete_agent', { agentId: idToDelete });
    }
  };

  const stopCall = () => {
    setIsCalling(false);
    if (myVideoRef.current && myVideoRef.current.srcObject) {
      myVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      myVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }
  };

  const startCall = (remotePeerId, withVideo = true) => {
    setCallType(withVideo ? 'video' : 'audio');
    setIsCalling(true);
    
    const constraints = { 
      video: withVideo ? { facingMode: "user" } : false, 
      audio: true 
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;
      const call = peerRef.current.call(remotePeerId, stream, {
        metadata: { type: withVideo ? 'video' : 'audio' }
      });
      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });
      // Handle call close
      call.on('close', stopCall);
    }).catch(err => {
      console.error("Failed to get local stream", err);
      setIsCalling(false);
      alert("Impossible d'accéder au matériel (caméra/micro). Vérifiez les permissions.");
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(lastInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-zinc-300">
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
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Code d'Agent (ID)</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ex: ALPHA-01" 
                  className={`w-full bg-black border ${error ? 'border-red-500' : 'border-zinc-800'} rounded-xl py-4 px-12 text-white focus:outline-none focus:border-white transition-all`}
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  required
                />
                <User className="w-5 h-5 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              {error && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 ml-1">{error}</p>}
            </div>

            <button 
              type="submit" 
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group"
            >
              Initialiser la session
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-8 overflow-y-auto">
        <div className="flex items-center gap-3 text-white">
          <Shield className={`w-8 h-8 ${isAdmin ? 'text-green-500' : 'text-zinc-400'}`} />
          <h1 className="text-2xl font-bold tracking-tighter">M.I.B</h1>
          {isAdmin && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded border border-green-500/30 uppercase font-bold">Admin</span>}
        </div>
        
        {/* Panel d'Invitation (ADMIN SEULEMENT) */}
        {isAdmin && (
          <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <UserPlus className="w-4 h-4 text-zinc-400" />
              Inviter un Agent
            </div>
            <form onSubmit={createInvite} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nom..."
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
              <button className="bg-white text-black text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-zinc-200">GÉNÉRER</button>
            </form>
            
            {lastInviteUrl && (
              <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Lien généré :</p>
                <div className="flex items-center gap-2 bg-black p-2 rounded-lg border border-zinc-700">
                  <input readOnly value={lastInviteUrl} className="flex-1 bg-transparent text-[10px] truncate outline-none" />
                  <button onClick={copyToClipboard} className="text-zinc-400 hover:text-white">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Canaux</p>
          <button className="flex items-center gap-2 bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            # général
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Agents & Statuts</p>
          <div className="flex flex-col gap-2">
            {allAgents.length === 0 && (
              <p className="text-[10px] text-zinc-600 italic px-1">Aucun agent enregistré</p>
            )}
            {allAgents.map((agent, idx) => {
              const activeUser = activeUsers.find(u => u.agentId === agent.agentId);
              const isOnline = !!activeUser;
              
              return (
                <div key={idx} className={`flex items-center justify-between text-sm p-1 group rounded-lg transition-colors ${isOnline ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-800'}`}></div>
                    <span className="truncate max-w-[120px]">
                      {agent.username} {agent.agentId === agentId && "(Vous)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOnline && agent.agentId !== agentId && !activeUser.peerId && (
                      <span className="text-[8px] text-zinc-600 animate-pulse">Liaison...</span>
                    )}
                    {isOnline && agent.agentId !== agentId && activeUser.peerId && (
                      <>
                        <button 
                          onClick={() => startCall(activeUser.peerId, false)}
                          title="Appel Audio"
                          className="p-1 hover:bg-zinc-800 rounded transition-all text-zinc-400 hover:text-white"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => startCall(activeUser.peerId, true)}
                          title="Appel Vidéo"
                          className="p-1 hover:bg-zinc-800 rounded transition-all text-zinc-400 hover:text-white"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isAdmin && agent.agentId !== "KARIM-ADMIN" && (
                      <button 
                        onClick={() => deleteAgent(agent.agentId)}
                        title="Supprimer l'Agent"
                        className="p-1 hover:bg-red-900/30 rounded transition-all text-zinc-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{username}</p>
                <p className="text-xs text-zinc-500">ID: {agentId.slice(0, 8)}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-black">
        {/* Header */}
        <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-white font-semibold"># général</h2>
            <p className="text-xs text-zinc-500">Canal sécurisé crypté</p>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
            <Shield className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Liaison Sécurisée</span>
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
        <div className="p-6 bg-black border-t border-zinc-800">
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
        <div className="fixed inset-0 bg-black/98 z-50 flex flex-col items-center justify-center p-4 md:p-10">
           <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-5xl h-[70vh] md:h-auto items-center justify-center">
              {/* Remote Video Container */}
              <div className="relative w-full max-w-[300px] md:max-w-none aspect-[3/4] md:aspect-video bg-zinc-900 rounded-3xl border-2 border-zinc-700 overflow-hidden flex items-center justify-center group">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  className={`w-full h-full object-cover ${callType === 'audio' ? 'hidden' : 'block'}`} 
                />
                {callType === 'audio' && (
                  <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                      <Shield className="w-12 h-12 text-zinc-500" />
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Liaison Audio Seule</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] text-white font-bold uppercase tracking-wider">
                  Agent Distant
                </div>
              </div>

              {/* My Video Container */}
              <div className="relative w-full max-w-[300px] md:max-w-none aspect-[3/4] md:aspect-video bg-zinc-900 rounded-3xl border-2 border-zinc-800 overflow-hidden flex items-center justify-center">
                <video 
                  ref={myVideoRef} 
                  autoPlay 
                  muted 
                  className={`w-full h-full object-cover ${callType === 'audio' ? 'hidden' : 'block'}`} 
                />
                {callType === 'audio' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-zinc-600" />
                    </div>
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Votre Terminal</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] text-white font-bold uppercase tracking-wider">
                  Moi
                </div>
              </div>
           </div>
           
           <div className="mt-10 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Session {callType === 'video' ? 'Vidéo' : 'Audio'} Active</span>
             </div>
             <button 
              onClick={stopCall}
              className="px-10 py-4 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 flex items-center gap-3"
             >
               <Phone className="w-5 h-5 rotate-[135deg]" />
               Terminer la liaison
             </button>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Settings className="w-5 h-5 text-zinc-400" />
                <h2 className="text-xl font-bold tracking-tight">Paramètres du Terminal</h2>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col gap-8">
              {/* Profile Section */}
              <div className="flex flex-col gap-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Identité de l'Agent</p>
                <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-zinc-800">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-white">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{username}</p>
                    <p className="text-xs text-zinc-500">ID de Session: {agentId}</p>
                  </div>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="flex flex-col gap-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Préférences Réseau</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-300">Notifications Sonores</span>
                    </div>
                    <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl border border-zinc-800 opacity-50">
                    <div className="flex items-center gap-3">
                      <Moon className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-300">Mode Furtif (Dark)</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Toujours Actif</div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="flex flex-col gap-4 mt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-xl hover:bg-red-600 hover:text-white transition-all font-bold"
                >
                  <LogOut className="w-5 h-5" />
                  Terminer la Session
                </button>
                <p className="text-center text-[10px] text-zinc-600 uppercase tracking-tighter">
                  La déconnexion réinitialisera votre accès temporaire.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
