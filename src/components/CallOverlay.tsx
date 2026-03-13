import React, { useState, useEffect } from 'react';
import { useCall } from '../context/CallContext';
import { useWalletStore } from '../store/walletStore';
import { toast } from 'sonner';
import ReportDialog from './ReportDialog';
import IceBreakerOverlay from './IceBreakerOverlay';
import { GiftOverlay } from './GiftOverlay';
import { Sparkles, Gift, Flag, Maximize2, Minimize2, User, Mic, MicOff, Video, X, UserPlus, UserCheck, Users, Heart, AlertTriangle, PhoneCall, VideoOff } from 'lucide-react';
import { profilesApi } from '../api/profiles';
import type { Profile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useWebRTC } from '../hooks/useWebRTC';

export default function CallOverlay() {
  const { callState, endCall, toggleMinimize, switchCallType, incomingCall, acceptIncomingCall, rejectIncomingCall } = useCall();
  const { wallet } = useWalletStore();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [hearts, setHearts] = useState<{id: number, left: number, size: number, color: string, duration: number}[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showRules, setShowRules] = useState(true);

  useEffect(() => {
    if (callState.isActive) {
      setShowRules(true);
      const timer = setTimeout(() => setShowRules(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [callState.isActive]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    toast.info(next ? "Microphone Muted" : "Microphone Unmuted");
  };

  const toggleCamera = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    toast.info(next ? "Camera Turned Off" : "Camera Turned On");
  };

  const handleVideoSwitchRequest = () => {
    if (callState.type === 'voice') {
      setShowVideoConfirm(true);
    } else {
      switchCallType('voice');
    }
  };

  const confirmVideoSwitch = () => {
    switchCallType('video');
    setShowVideoConfirm(false);
  };

  // Animation styles
  const floatingHeartStyle = `
    @keyframes floatUp {
      0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
      10% { opacity: 1; }
      50% { transform: translateY(-50vh) scale(1) rotate(10deg); opacity: 0.8; }
      100% { transform: translateY(-100vh) scale(1.5) rotate(-10deg); opacity: 0; }
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(1.3); opacity: 0; }
    }
    .floating-heart {
      position: absolute;
      bottom: 0;
      pointer-events: none;
      z-index: 5;
    }
    .pulse-ring {
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
  `;

  useEffect(() => {
    if (callState.isActive) {
      // Ambient hearts
      const interval = setInterval(() => {
        if (Math.random() > 0.7) return; // Randomize frequency
        const newHeart = {
          id: Date.now(),
          left: Math.random() * 90 + 5, // 5% to 95% width
          size: Math.random() * 20 + 15, // 15-35px
          color: ['#ef4444', '#ec4899', '#f43f5e', '#d946ef', '#8b5cf6'][Math.floor(Math.random() * 5)],
          duration: Math.random() * 3 + 3 // 3-6s
        };
        setHearts(prev => [...prev.slice(-20), newHeart]);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [callState.isActive]);

  const triggerHeartBurst = () => {
    const burst = Array.from({length: 8}).map((_, i) => ({
      id: Date.now() + i,
      left: 50 + (Math.random() * 40 - 20), // Center burst
      size: Math.random() * 30 + 20,
      color: ['#ec4899', '#f43f5e'][Math.floor(Math.random() * 2)],
      duration: Math.random() * 2 + 2
    }));
    setHearts(prev => [...prev, ...burst]);
  };

  useEffect(() => {
    if (callState.isActive) {
      toast("⚠️ Call Rules", {
        description: "No abuse, nudity, or misbehavior allowed. Violators will be banned.",
        duration: 5000,
        position: 'top-center',
        style: { background: '#FEF2F2', border: '1px solid #EF4444', color: '#B91C1C' }
      });
    }
  }, [callState.isActive]);

  useEffect(() => {
    if (callState.otherUserId) {
        profilesApi.getById(callState.otherUserId)
            .then(setOtherProfile)
            .catch(() => setOtherProfile(null));
    } else {
        setOtherProfile(null);
    }
  }, [callState.otherUserId]);

  const handleFollow = async () => {
    if (!callState.otherUserId) return;
    try {
        if (otherProfile?.is_following) {
             await profilesApi.unfollow(callState.otherUserId);
             setOtherProfile(prev => prev ? {...prev, is_following: false, followers_count: Math.max(0, (prev.followers_count || 0) - 1)} : null);
             toast.success('Unfollowed');
        } else {
             await profilesApi.follow(callState.otherUserId);
             setOtherProfile(prev => prev ? {...prev, is_following: true, followers_count: (prev.followers_count || 0) + 1} : null);
             toast.success('Followed');
        }
    } catch (e) {
        toast.error('Failed to update follow status');
    }
  };

  const sendFriendRequest = async () => {
    if (!callState.otherUserId) return;
    try {
        const data = await profilesApi.sendFriendRequest(callState.otherUserId);
        setOtherProfile(prev => prev ? {
            ...prev,
            friend_request_status: {
                status: 'pending',
                direction: 'sent',
                id: data.request_id
            }
        } : null);
        toast.success('Friend Request Sent');
    } catch (e) {
        toast.error('Failed to send request');
    }
  };

  const handleFriendResponse = async (action: 'accept' | 'reject') => {
    if (!otherProfile?.friend_request_status?.id) return;
    try {
        await profilesApi.respondFriendRequest(otherProfile.friend_request_status.id, action);
        if (action === 'accept') {
             setOtherProfile(prev => prev ? {
                ...prev,
                friend_request_status: {
                    ...prev.friend_request_status!,
                    status: 'accepted'
                },
                is_following: true
            } : null);
            toast.success('Friend Request Accepted');
        } else {
             setOtherProfile(prev => prev ? {
                ...prev,
                friend_request_status: null
            } : null);
            toast.success('Friend Request Rejected');
        }
    } catch (e) {
        toast.error('Failed to respond');
    }
  };

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const localPreviewRef = React.useRef<HTMLVideoElement>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement>(null);
  const { localStream, remoteStream, isConnected, sendCallEnd } = useWebRTC({
    roomId: callState.roomId,
    enabled: callState.isActive,
    kind: callState.type === "video" ? "video" : "voice",
    isCaller: callState.isCaller,
  });

  const handleEndCall = () => {
    sendCallEnd();
    endCall();
  };

  useEffect(() => {
    if (videoRef.current && callState.type === "video") {
      const streamToUse = remoteStream || localStream;
      if (streamToUse) {
        videoRef.current.srcObject = streamToUse;
      }
    }
  }, [localStream, remoteStream, callState.type]);

  useEffect(() => {
    if (localPreviewRef.current && localStream && callState.type === "video") {
      localPreviewRef.current.srcObject = localStream;
    }
  }, [localStream, callState.type]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!callState.isActive && !incomingCall) return null;

  if (!callState.isActive && incomingCall) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="bg-gray-900 rounded-3xl p-8 max-w-sm w-full text-center border border-gray-700 shadow-2xl">
          <p className="text-sm text-gray-400 mb-2">Incoming {incomingCall.callType} call</p>
          <p className="text-lg font-semibold text-white mb-6">Someone is calling you</p>
          <div className="flex justify-center gap-6">
            <button
              onClick={rejectIncomingCall}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 text-gray-200"
            >
              <X className="w-7 h-7" />
            </button>
            <button
              onClick={acceptIncomingCall}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white"
            >
              <PhoneCall className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState.isMinimized) {
    return (
      <div className="fixed top-24 right-4 z-50 bg-gray-900 rounded-2xl shadow-xl w-32 overflow-hidden border border-gray-700 animate-in fade-in zoom-in">
        <div className="relative h-40 bg-gray-800 flex items-center justify-center">
          <Avatar className="w-16 h-16 border-2 border-white">
             <AvatarImage src={otherProfile?.photo} />
             <AvatarFallback><User className="w-8 h-8 text-gray-400" /></AvatarFallback>
          </Avatar>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <p className="text-white text-xs font-mono">{formatDuration(callState.duration)}</p>
          </div>
          <button 
            onClick={toggleMinimize}
            className="absolute top-2 right-2 p-1 bg-black/40 rounded-full"
          >
             <Maximize2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col overflow-hidden">
      <style>{floatingHeartStyle}</style>
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      
      {/* Floating Hearts Layer */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {hearts.map(h => (
          <Heart 
            key={h.id} 
            className="floating-heart" 
            style={{ 
              left: `${h.left}%`, 
              width: `${h.size}px`, 
              height: `${h.size}px`, 
              color: h.color,
              fill: h.color,
              animation: `floatUp ${h.duration}s linear forwards`
            }} 
          />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 right-4 z-10 flex gap-3">
        <button 
          onClick={() => setIsGiftsOpen(true)}
          className="p-3 bg-pink-500/20 hover:bg-pink-500/40 rounded-full text-pink-500 backdrop-blur-sm transition-colors"
          title="Send Gift"
        >
          <Gift className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setIsGamesOpen(true)}
          className="p-3 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-full text-indigo-400 backdrop-blur-sm transition-colors"
          title="Play Icebreaker Games"
        >
          <Sparkles className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setIsReportOpen(true)}
          className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 backdrop-blur-sm transition-colors"
        >
          <Flag className="w-6 h-6 text-red-500" />
        </button>
        <button 
          onClick={toggleMinimize}
          className="p-3 bg-black/40 rounded-full text-white backdrop-blur-sm"
        >
          <Minimize2 className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Temporary Rules Popup */}
      {showRules && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 z-40 animate-in slide-in-from-top-4 fade-in duration-500 pointer-events-none">
           <AlertTriangle className="w-5 h-5 text-yellow-400" />
           <span className="text-white font-medium text-sm">No abuse, No nudity. Be respectful.</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background / Video Placeholder */}
        <div className="absolute inset-0 bg-gray-900">
            {callState.type === 'video' ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-6 right-4 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/70 bg-black/50 shadow-lg">
                    <video
                      ref={localPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                    <div className="relative w-40 h-40 rounded-full flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-pink-500/30 pulse-ring"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-pink-500/50 animate-pulse"></div>
                        <Avatar className="w-full h-full border-4 border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.5)] z-10">
                            <AvatarImage src={otherProfile?.photo} />
                            <AvatarFallback><User className="w-20 h-20 text-gray-400" /></AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            )}
            
            {/* Rules Overlay (Popup) */}
            {showRules && (
              <div className="absolute bottom-32 left-0 right-0 flex justify-center z-20 pointer-events-none animate-in fade-in zoom-in duration-500">
                <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full text-sm text-white font-medium border border-white/10 shadow-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>No abuse • No nudity • Be respectful</span>
                </div>
              </div>
            )}
        </div>

        {/* User Info - Top Left Positioned */}
        <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2 max-w-[200px]">
             <div className="flex items-center gap-2">
                 <h2 className="text-xl font-bold text-white shadow-sm drop-shadow-md truncate">{otherProfile?.display_name || `User #${callState.otherUserId || 'Unknown'}`}</h2>
                 {otherProfile && (
                    <div className="flex items-center gap-1 text-white/90 text-[10px] font-medium bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <Users size={10} />
                        <span>{otherProfile.followers_count || 0}</span>
                    </div>
                 )}
             </div>
             
             <button 
                onClick={handleFollow}
                className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all shadow-lg active:scale-95 ${otherProfile?.is_following ? 'bg-white/90 text-gray-900' : 'bg-pink-500 text-white'}`}
             >
                {otherProfile?.is_following ? <UserCheck size={12} /> : <UserPlus size={12} />}
                {otherProfile?.is_following ? 'Following' : 'Follow'}
             </button>
        </div>

        {/* Call Status Card - Top Left (Below User Info) */}
        <div className="absolute top-24 left-4 z-10">
           <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10 w-48">
              <div className="flex items-center justify-between mb-1">
                 <p className="text-primary-300 text-xs font-bold capitalize flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'} animate-pulse inline-block`} title={isConnected ? 'Connected' : 'Connecting...'} />
                    {callState.type} {isConnected ? '' : '(connecting…)'}
                 </p>
                 <span className="text-yellow-400 font-bold text-[10px]">Bal: {wallet?.coin_balance || 0}</span>
              </div>
              
              <div className="text-left">
                  <p className="text-white text-2xl font-mono font-light tracking-widest my-1">
                    {formatDuration(callState.duration)}
                  </p>
                  <p className="text-[10px] text-gray-400">{callState.costPerMinute} coins/min</p>
              </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-8 pb-12 rounded-t-3xl border-t border-gray-800 shadow-2xl">
        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {callState.type === 'video' && (
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full transition-colors ${isCameraOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}
          
          <button 
            onClick={handleEndCall}
            className="p-6 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] transform active:scale-95 transition-all hover:scale-110"
          >
            <X className="w-8 h-8 text-white" />
          </button>

          <button 
            onClick={triggerHeartBurst}
            className="p-4 rounded-full bg-pink-500/20 text-pink-500 hover:bg-pink-500/30 transition-colors active:scale-90"
            title="Send Love"
          >
            <Heart className="w-6 h-6 fill-current animate-pulse" />
          </button>
          
          <button 
            onClick={() => setIsGiftsOpen(true)}
            className="p-4 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors active:scale-90"
            title="Send Gift"
          >
            <Gift className="w-6 h-6" />
          </button>

          <button 
            onClick={handleVideoSwitchRequest}
            className={`p-4 rounded-full transition-colors ${callState.type === 'video' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {callState.type === 'video' ? <Video className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Video Switch Confirmation Dialog */}
      {showVideoConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl scale-100 animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Switch to Video Call?</h3>
              <p className="text-gray-500 mb-6">
                Video calls cost more coins per minute. Are you sure you want to enable video?
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowVideoConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmVideoSwitch}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/30"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {isReportOpen && (
        <ReportDialog 
          isOpen={isReportOpen} 
          onClose={() => setIsReportOpen(false)} 
          reportedUserId={callState.otherUserId || 0}
        />
      )}
      {isGamesOpen && (
        <IceBreakerOverlay 
          onClose={() => setIsGamesOpen(false)} 
        />
      )}
      {isGiftsOpen && callState.otherUserId && (
        <GiftOverlay 
          receiverId={callState.otherUserId} 
          onClose={() => setIsGiftsOpen(false)} 
        />
      )}
    </div>
  );
}
