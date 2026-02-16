import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, Video, MoreVertical, Image as ImageIcon, 
  Camera, Mic, Send, Lock, ShieldCheck, Film, Gamepad2, X,
  Smile, Reply, Play, Pause, Trash2, Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';
import { useCall } from '@/context/CallContext';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatApi } from '@/api/chat';
import type { Message as ApiMessage, Room } from '@/types';
import { profilesApi } from '@/api/profiles';
import IceBreakerOverlay from '@/components/IceBreakerOverlay';
import { GAMES, Game } from '@/constants/games';
import TicTacToe from '@/components/games/TicTacToe';
import CandyMatch from '@/components/games/CandyMatch';
import FruitSlash from '@/components/games/FruitSlash';
import CarromBoard from '@/components/games/CarromBoard';
import LudoBoard from '@/components/games/LudoBoard';
import { EMOJI_CATEGORIES, GIF_CATEGORIES } from '@/constants/chatData';

type UiMessage = {
  id: string;
  text?: string;
  image?: string;
  audio?: boolean;
  gameId?: string;
  gameTitle?: string;
  sender: 'me' | 'other';
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'video' | 'game_invite';
};

const AudioMessage = ({ src }: { src: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 min-w-[140px] bg-black/5 p-2 rounded-full">
        <button onClick={togglePlay} className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shrink-0">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="h-1 flex-1 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-100" 
              style={{ width: `${progress}%` }}
            />
        </div>
        <audio ref={audioRef} src={src} className="hidden" preload="metadata" />
    </div>
  );
};

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { startCall } = useCall();
  const { user } = useAuthStore();
  const { checkBalance, deductCoins, addCoins, fetchWallet } = useWalletStore();
  const isFemale = user?.gender === 'F';

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [room, setRoom] = useState<Room | null>(null);
  const [otherProfileName, setOtherProfileName] = useState<string>('User');
  const [otherProfilePhoto, setOtherProfilePhoto] = useState<string | null>(null);
  const [presence, setPresence] = useState<'busy' | 'active'>('active');
  const [showIceBreaker, setShowIceBreaker] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'gif'>('emoji');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Dark & Sexy');
  const [activeGifCategory, setActiveGifCategory] = useState<keyof typeof GIF_CATEGORIES>('Sexy');
  const [replyingTo, setReplyingTo] = useState<UiMessage | null>(null);

  const toUi = (m: ApiMessage): UiMessage => {
    let type: UiMessage['type'] = 'text';
    let gameId, gameTitle;

    if (m.type === 'text' && m.content.startsWith('[GAME_INVITE:')) {
      type = 'game_invite';
      const parts = m.content.split(':');
      gameId = parts[1];
      gameTitle = parts[2]?.replace(']', '');
    } else if (m.type === 'voice') {
       type = 'audio';
    } else {
       type = m.type as any;
    }

    return {
      id: String(m.id),
      text: m.content,
      image: (m.type === 'image' || m.type === 'video' || m.type === 'voice' || m.type === 'audio') ? m.media_url : undefined,
      audio: m.type === 'audio' || m.type === 'voice',
      gameId,
      gameTitle,
      sender: Number(m.sender) === Number(user?.id) ? 'me' : 'other',
      timestamp: new Date(m.created_at).getTime(),
      type,
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      try {
        fetchWallet(); // Ensure wallet is up to date
        if (!userId) return;
        try {
          const p = await profilesApi.getById(Number(userId));
          setOtherProfileName(p.display_name || `User #${userId}`);
          setOtherProfilePhoto(p.photo || null);
        } catch (e) {
          console.error(e);
        }
        try {
          const pr = await chatApi.getPresence(Number(userId));
          setPresence(pr.status);
        } catch (e) {
          console.error(e);
        }
        const r = await chatApi.createRoom(Number(userId));
        setRoom(r);
        const msgs = await chatApi.getMessages(r.id);
        setMessages(msgs.map(toUi));
      } catch (e) {
        console.error('chat init error', e);
      }
    };
    init();
  }, [userId, user?.id]);

  const handleSendMedia = async (type: 'image' | 'video' | 'voice', source: 'camera' | 'gallery' = 'gallery') => {
    // 1. Check Balance
    let cost = 0;
    let typeName = '';
     
    switch (type) {
      case 'image': cost = 15; typeName = 'Photo'; break;
      case 'video': cost = 30; typeName = 'Video'; break;
      case 'voice': cost = 10; typeName = 'Voice Note'; break;
    }

    if (!isFemale) {
      if (!checkBalance(cost)) {
        toast.error(`Insufficient coins! ${typeName} costs ${cost} coins.`);
        return;
      }
    }

    // 2. Handle File Selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*';
    if (source === 'camera') {
      // Check for Secure Context
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
         toast.error("Camera access requires HTTPS or Localhost");
         return;
      }
      input.capture = 'environment'; // Use rear camera by default
    }
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // 3. Deduct Coins
      if (!isFemale) {
        const success = await deductCoins(cost, `Sent ${typeName}`);
        if (!success) return;
      } else {
        toast.success(`${typeName} sent (Free for Women)`);
      }

      // 4. Upload & Send
      const loadingToast = toast.loading(`Uploading ${typeName}...`);
      try {
        const { url } = await chatApi.uploadMedia(file, type);
        
        if (room) {
           const sendType: 'text' | 'image' | 'audio' | 'video' = type === 'voice' ? 'audio' : type;
           // @ts-ignore
           await chatApi.sendMessage(room.id, '', sendType, url);
           // Refresh messages to show the new one
           const msgs = await chatApi.getMessages(room.id);
           setMessages(msgs.map(toUi));
        }
        toast.dismiss(loadingToast);
        toast.success("Sent!");
      } catch (error) {
        console.error(error);
        toast.dismiss(loadingToast);
        toast.error("Failed to send media");
      }
    };
    
    input.click();
    setShowMediaMenu(false);
  };

  const handleSendGif = async (url: string) => {
    // 1. Deduct Coins (maybe less for GIFs? or same as image?)
    // Let's say GIFs are 5 coins
    if (!isFemale) {
      if (!checkBalance(5)) {
        toast.error("Insufficient coins to send GIF (5 coins)");
        return;
      }
      const success = await deductCoins(5, 'Sent GIF');
      if (!success) return;
    }

    const newMessage: UiMessage = {
      id: Date.now().toString(),
      text: '',
      image: url,
      sender: 'me',
      timestamp: Date.now(),
      type: 'image', // Treat as image for now
    };

    setMessages(prev => [...prev, newMessage]);
    setShowEmojiPicker(false);

    if (room) {
        try {
            await chatApi.sendMessage(room.id, '', 'image', url);
        } catch (e) {
            console.error('send gif error', e);
            toast.error('Failed to send GIF');
        }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    let textToSend = inputValue;
    if (replyingTo) {
      const replyPrefix = `> [Reply to ${replyingTo.sender === 'me' ? 'You' : otherProfileName}]: ${replyingTo.type === 'text' ? replyingTo.text?.substring(0, 30) + '...' : '[' + replyingTo.type + ']'}\n\n`;
      textToSend = replyPrefix + textToSend;
    }

    // Deduct Coin Logic for Text
    if (!isFemale) {
      if (!checkBalance(1)) {
        toast.error("Insufficient coins to send message! Please recharge.");
        return;
      }
      const success = await deductCoins(1, 'Chat Message');
      if (!success) return;
    }

    const newMessage: UiMessage = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'me',
      timestamp: Date.now(),
      type: 'text',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setReplyingTo(null);
    setShowEmojiPicker(false);

    if (room) {
      try {
        await chatApi.sendMessage(room.id, newMessage.text || '');
      } catch (e) {
        console.error('send message error', e);
      }
    }
  };

  const handleSendImage = () => {
    handleSendMedia('image');
  };

  const startRecording = async () => {
    // Check for Secure Context
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
       toast.error("Voice recording requires HTTPS");
       return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice_note.webm", { type: 'audio/webm' });
        
        // Send Logic
        if (!isFemale) {
          const success = await deductCoins(10, 'Sent Voice Note');
          if (!success) return;
        } else {
          toast.success("Voice message sent (Free for Women)");
        }

        const loadingToast = toast.loading("Sending voice note...");
        try {
          const { url } = await chatApi.uploadMedia(audioFile, 'voice');
          if (room) {
             await chatApi.sendMessage(room.id, '', 'audio', url);
             // Refresh
             const msgs = await chatApi.getMessages(room.id);
             setMessages(msgs.map(toUi));
          }
          toast.dismiss(loadingToast);
          toast.success("Sent!");
        } catch (error) {
          console.error(error);
          toast.dismiss(loadingToast);
          toast.error("Failed to send voice note");
        }
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording... Tap again to send");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Check balance before starting
      if (!isFemale && !checkBalance(10)) {
        toast.error("Insufficient coins! Voice Note costs 10 coins.");
        return;
      }
      startRecording();
    }
  };

  const handleSendGameInvite = async (game: Game) => {
    if (!room) return;
    
    // Deduct coins for game invite
    if (!isFemale) {
      if (!checkBalance(5)) {
        toast.error("Insufficient coins to send game invite (5 coins)");
        return;
      }
      const success = await deductCoins(5, 'Sent Game Invite');
      if (!success) return;
    } else {
        toast.success("Game invite sent (Free for Women)");
    }

    const inviteText = `[GAME_INVITE:${game.id}:${game.title}]`;
    
    const newMessage: UiMessage = {
      id: Date.now().toString(),
      text: inviteText,
      gameId: game.id,
      gameTitle: game.title,
      sender: 'me',
      timestamp: Date.now(),
      type: 'game_invite',
    };

    setMessages(prev => [...prev, newMessage]);
    setShowGameSelector(false);
    
    try {
      await chatApi.sendMessage(room.id, inviteText, 'game_invite');
    } catch (e) {
      console.error('send game invite error', e);
      toast.error('Failed to send game invite');
    }
  };

  const handlePlayGame = async (gameId?: string) => {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;

    if (!isFemale) {
       if (!checkBalance(10)) {
         toast.error("Insufficient coins! Entry Fee: 10 coins");
         return;
       }
       const success = await deductCoins(10, `Played ${game.title}`);
       if (!success) return;
    }
    setActiveGame(game);
  };

  const handleGameOver = async (winner: 'me' | 'opponent' | 'draw') => {
      if (winner === 'me') {
        const prize = 20;
        toast.success(`You Won! +${prize} Coins!`, { icon: '🏆' });
        // Use addCoins (which calls earnCoins) to correctly record earnings
        addCoins(prize, `Won ${activeGame?.title}`);
      } else if (winner === 'opponent') {
        toast.info("You Lost!");
      } else {
        toast.info("Draw!");
      }
      setActiveGame(null);
  };

  if (activeGame) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
        <div className="p-4 flex items-center justify-between bg-gray-900 text-white shadow-lg">
          <button 
            onClick={() => setActiveGame(null)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg tracking-wide">{activeGame.title}</span>
          <div className="w-10" /> 
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-800 text-white p-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black opacity-50 pointer-events-none"></div>
          <div className="relative z-10 w-full max-w-md">
            {activeGame.id === 'tictactoe' && <TicTacToe onGameOver={handleGameOver} />}
            {activeGame.id === 'fruit' && <FruitSlash onGameOver={handleGameOver} />}
            {activeGame.id === 'candy' && <CandyMatch onGameOver={handleGameOver} />}
            {activeGame.id === 'carrom' && <CarromBoard onGameOver={handleGameOver} />}
            {activeGame.id === 'ludo' && <LudoBoard onGameOver={handleGameOver} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-3 shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="relative">
            <Avatar className="w-10 h-10 border border-gray-200">
              <AvatarImage src={otherProfilePhoto || `https://i.pravatar.cc/150?u=${userId}`} className="object-cover" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                presence === 'busy' ? 'bg-red-500' : 'bg-green-500'
              }`}
            ></span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">{otherProfileName}</h2>
            <p
              className={`text-xs flex items-center gap-1 ${
                presence === 'busy' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              <ShieldCheck className="w-3 h-3" /> {presence === 'busy' ? 'In Call' : 'Active'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => setShowIceBreaker(true)} className="px-3 py-2 bg-gray-100 rounded text-sm mr-2">
            Games
          </button>
          <button
            onClick={() => {
              if (presence === 'busy') {
                toast.error('User is currently in a call');
                return;
              }
              startCall('voice', { userId: Number(userId) });
            }}
            className="p-2 hover:bg-gray-100 rounded-full text-blue-600"
          >
            <Phone className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              if (presence === 'busy') {
                toast.error('User is currently in a call');
                return;
              }
              startCall('video', { userId: Number(userId) });
            }}
            className="p-2 hover:bg-gray-100 rounded-full text-blue-600"
          >
            <Video className="w-6 h-6" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="bg-yellow-50 px-4 py-2 text-xs text-center text-yellow-800 flex items-center justify-center gap-1 border-b border-yellow-100">
        <Lock className="w-3 h-3" /> Messages are end-to-end encrypted. No one outside this chat can read them.
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              onClick={() => setReplyingTo(msg)}
              className={`max-w-[75%] rounded-2xl p-3 shadow-sm cursor-pointer transition-all active:scale-95 ${
                msg.sender === 'me' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              } ${replyingTo?.id === msg.id ? 'ring-2 ring-blue-400' : ''}`}
            >
              {msg.type === 'text' && <p>{msg.text}</p>}
              
              {msg.type === 'image' && (
                <div className="rounded-lg overflow-hidden">
                   <img src={msg.image} alt="Shared" className="w-full h-auto max-h-60 object-cover" />
                </div>
              )}

              {msg.type === 'video' && (
                <div className="rounded-lg overflow-hidden">
                   <video src={msg.image} controls className="w-full h-auto max-h-60 object-cover" />
                </div>
              )}

              {msg.type === 'game_invite' && (
                <div className="min-w-[240px] max-w-[280px]">
                   <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      {/* Game Header */}
                      <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                          <Gamepad2 className="w-5 h-5" />
                          <span className="font-bold text-sm">Game Challenge</span>
                        </div>
                        <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] text-white font-bold backdrop-blur-sm">
                          WIN 20 🪙
                        </div>
                      </div>
                      
                      {/* Game Body */}
                      <div className="p-4 text-center">
                        <p className="text-xs text-gray-500 mb-2">
                          {msg.sender === 'me' ? 'You sent a challenge:' : 'Invited you to play:'}
                        </p>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide mb-4">
                          {msg.gameTitle}
                        </h3>

                        <button 
                          onClick={() => handlePlayGame(msg.gameId)}
                          className="w-full bg-black text-white hover:bg-gray-800 font-bold py-2.5 rounded-lg text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span>Play Now</span>
                          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] text-white/90">10 🪙</span>
                        </button>
                      </div>
                   </div>
                </div>
              )}

              {msg.type === 'audio' && (
                <AudioMessage src={msg.image || msg.text || ''} />
              )}

              <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-primary-100' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
        {replyingTo && (
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border-l-4 border-primary text-xs w-full">
                <div className="flex-1 overflow-hidden">
                    <span className="font-bold text-primary block">{replyingTo.sender === 'me' ? 'Replying to yourself' : `Replying to ${otherProfileName}`}</span>
                    <p className="text-gray-500 truncate">{replyingTo.type === 'text' ? replyingTo.text : `[${replyingTo.type}]`}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
        )}

        {showEmojiPicker && (
            <div className="bg-gray-50 rounded-xl mb-2 animate-in slide-in-from-bottom-2 w-full border border-gray-200 shadow-lg overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button 
                    onClick={() => setPickerTab('emoji')}
                    className={`flex-1 py-2 text-sm font-medium ${pickerTab === 'emoji' ? 'bg-white text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                    Emojis
                    </button>
                    <button 
                    onClick={() => setPickerTab('gif')}
                    className={`flex-1 py-2 text-sm font-medium ${pickerTab === 'gif' ? 'bg-white text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                    GIFs
                    </button>
                </div>

                {/* Content */}
                <div className="h-60 flex flex-col">
                    {pickerTab === 'emoji' ? (
                    <>
                        {/* Categories */}
                        <div className="flex overflow-x-auto p-2 bg-gray-100 gap-2 scrollbar-hide no-scrollbar">
                            {Object.keys(EMOJI_CATEGORIES).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveEmojiCategory(cat as any)}
                                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${activeEmojiCategory === cat ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                            ))}
                        </div>
                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-7 gap-1">
                            {EMOJI_CATEGORIES[activeEmojiCategory].filter(e => e !== 'mw' && e !== 'Mw').map((emoji, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => setInputValue(prev => prev + emoji)}
                                    className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-white flex items-center justify-center aspect-square"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        </div>
                    </>
                    ) : (
                    <>
                        {/* GIF Categories */}
                        <div className="flex overflow-x-auto p-2 bg-gray-100 gap-2 scrollbar-hide no-scrollbar">
                            {Object.keys(GIF_CATEGORIES).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveGifCategory(cat as any)}
                                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${activeGifCategory === cat ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                            ))}
                        </div>
                        {/* GIF Grid */}
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="grid grid-cols-2 gap-2">
                            {GIF_CATEGORIES[activeGifCategory].map((url, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleSendGif(url)}
                                    className="rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-all active:scale-95"
                                >
                                    <img src={url} alt="GIF" className="w-full h-24 object-cover" />
                                </button>
                            ))}
                            </div>
                        </div>
                    </>
                    )}
                </div>
            </div>
        )}

        <div className="flex items-center gap-2 w-full">
        {/* Media Menu */}
        <div className="relative flex items-center gap-1">
          {/* Quick Camera */}
          <button 
            onClick={() => handleSendMedia('image', 'camera')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Camera className="w-6 h-6" />
          </button>

          <button 
            onClick={() => setShowMediaMenu(!showMediaMenu)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreVertical className="w-6 h-6" />
          </button>

          <button 
            onClick={() => setShowGameSelector(!showGameSelector)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Gamepad2 className="w-6 h-6 text-indigo-500" />
          </button>
          
          {showGameSelector && (
             <div className="absolute bottom-16 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 w-[280px] z-20 animate-in slide-in-from-bottom-2">
               <div className="flex justify-between items-center mb-2 px-1">
                  <h3 className="font-bold text-gray-700 text-sm">Play a Game</h3>
                  <button onClick={() => setShowGameSelector(false)}><X className="w-4 h-4 text-gray-400" /></button>
               </div>
               <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                 {GAMES.map(game => (
                   <button 
                     key={game.id}
                     onClick={() => handleSendGameInvite(game)}
                     className="flex flex-col items-center gap-1 p-2 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-lg transition-all"
                   >
                     <div className={`w-8 h-8 ${game.imageColor} rounded-full flex items-center justify-center text-white text-xs`}>
                        {game.title[0]}
                     </div>
                     <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{game.title}</span>
                   </button>
                 ))}
               </div>
             </div>
          )}
          
          {showMediaMenu && (
            <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 min-w-[200px] flex flex-col gap-3 z-10 animate-in slide-in-from-bottom-2">
              
              {/* Photo Options */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 px-2 uppercase">Photo (15c)</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSendMedia('image', 'camera')}
                    className="flex-1 flex flex-col items-center gap-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs">Camera</span>
                  </button>
                  <button 
                    onClick={() => handleSendMedia('image', 'gallery')}
                    className="flex-1 flex flex-col items-center gap-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-xs">Gallery</span>
                  </button>
                </div>
              </div>

              {/* Video Options */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 px-2 uppercase">Video (30c)</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSendMedia('video', 'camera')}
                    className="flex-1 flex flex-col items-center gap-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs">Camera</span>
                  </button>
                  <button 
                    onClick={() => handleSendMedia('video', 'gallery')}
                    className="flex-1 flex flex-col items-center gap-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 transition-colors"
                  >
                    <Film className="w-5 h-5" />
                    <span className="text-xs">Gallery</span>
                  </button>
                </div>
              </div>

            </div>
          )}
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Smile className="w-6 h-6" />
          </button>
        </div>

        {isRecording ? (
          <div className="flex-1 bg-red-50 rounded-full px-4 py-2 flex items-center justify-between border border-red-100 animate-pulse">
             <div className="flex items-center gap-2 text-red-600">
               <div className="w-2 h-2 rounded-full bg-red-600 animate-bounce" />
               <span className="font-medium text-sm">Recording...</span>
             </div>
             <button onClick={stopRecording} className="p-1 bg-white rounded-full text-red-600 shadow-sm">
               <div className="w-4 h-4 bg-red-600 rounded-sm" />
             </button>
          </div>
        ) : (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        )}
        
        {inputValue.trim() ? (
          <button 
            onClick={handleSendMessage}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={handleVoiceRecord}
            className={`p-2 rounded-full transition-colors shadow-sm ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>
      </div>
      {showIceBreaker && <IceBreakerOverlay onClose={() => setShowIceBreaker(false)} />}
    </div>
  );
}
