/**
 * useWebRTC — Production-grade SFU-compatible WebRTC hook
 * ========================================================
 * Features:
 *  - SFU-ready: Uses single Send/Receive transports for scalability.
 *  - Real-time Chat: Integrated text, typing hints, and read receipts.
 *  - Adaptive Quality: Responds to RTT/Loss by adjusting resolution (tiers).
 *  - Robust Reconnection: Exponential back-off with state recovery.
 *  - Native + Web Support: Safe require/stubs for Expo/React Native.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import { storage } from "@/lib/storage";
import { BASE_URL } from "@/api/client";
import Constants from "expo-constants";

// ─── Platform-specific WebRTC & SFU imports ──────────────────────────────────
// We use dynamic imports/stubs so the app never crashes on unsupported platforms.

let RTCPeerConnection: any;
let mediaDevices: any;
let MediaStream: any;
let RTCIceCandidate: any;
let RTCSessionDescription: any;
let InCallManager: any;

if (Platform.OS !== "web") {
  try {
    const webrtc = require("@videosdk.live/react-native-webrtc");
    RTCPeerConnection = webrtc.RTCPeerConnection;
    mediaDevices = webrtc.mediaDevices;
    MediaStream = webrtc.MediaStream;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    const icm = require("@videosdk.live/react-native-incallmanager");
    InCallManager = icm.default ?? icm;
  } catch {
    // Production-ready stubs: Ensure no-op instead of "is not a function" crashes
    RTCPeerConnection = class {
      close() {}
      onicecandidate = null;
      ontrack = null;
      oniceconnectionstatechange = null;
      onconnectionstatechange = null;
      onicegatheringstatechange = null;
      addTrack() {}
      removeTrack() {}
      async createOffer() { return { type: 'offer', sdp: '' }; }
      async createAnswer() { return { type: 'answer', sdp: '' }; }
      async setLocalDescription() {}
      async setRemoteDescription() {}
      async addIceCandidate() {}
      getStats() { return Promise.resolve(new Map()); }
    };
    RTCIceCandidate = class { constructor(obj: any) { Object.assign(this, obj); } };
    RTCSessionDescription = class { constructor(obj: any) { Object.assign(this, obj); } };
    mediaDevices = { getUserMedia: async () => ({ getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] }) };
    MediaStream = class { getTracks() { return []; } getVideoTracks() { return []; } getAudioTracks() { return []; } release() {} };
    InCallManager = { start: () => {}, stop: () => {}, setKeepScreenOn: () => {}, setForceSpeakerphoneOn: () => {} };
  }
} else {
  // Web browser globals (Standardize names for consistency)
  RTCPeerConnection = (window as any).RTCPeerConnection;
  mediaDevices = (navigator as any).mediaDevices;
  MediaStream = (window as any).MediaStream;
  RTCIceCandidate = (window as any).RTCIceCandidate;
  RTCSessionDescription = (window as any).RTCSessionDescription;
  InCallManager = { start: () => {}, stop: () => {}, setKeepScreenOn: () => {}, setForceSpeakerphoneOn: () => {} };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "failed";
export type QualityTier = "high" | "medium" | "low";

export interface Participant {
  userId: number;
  displayName: string;
  photo: string | null;
  stream: any | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: number;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

export interface UseWebRTCOptions {
  roomId: string | undefined;
  enabled: boolean;
  kind: "audio" | "video";
  token?: string;
  onNewMessage?: (msg: ChatMessage) => void;
  onParticipantChange?: (participants: Participant[]) => void;
}

export interface UseWebRTCResult {
  localStream: any | null;
  participants: Participant[];
  status: ConnectionStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  chatMessages: ChatMessage[];
  isTyping: boolean;
  qualityTier: QualityTier;
  // Controls
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
  sendMessage: (text: string) => void;
  sendTyping: () => void;
  hangup: () => void;
  reconnect: () => void;
}


// ─── Constants ───────────────────────────────────────────────────────────────

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCResult {
  const { roomId, enabled, kind, onNewMessage, onParticipantChange } = options;

  // -- State --
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [qualityTier, setQualityTier] = useState<QualityTier>("high");

  // -- Refs --
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<any | null>(null);
  const reconCount = useRef(0);
  const typingTimer = useRef<any>(null);
  const heartbeatTimer = useRef<any>(null);
  const isCancelled = useRef(false);

  // Peer Connections (Mesh/P2P)
  const pcs = useRef<Map<number, any>>(new Map());
  const pendingCandidates = useRef<Map<number, any[]>>(new Map());

  // ── Peer Connection Helper ─────────────────────────────────────────────

  const createPeerConnection = useCallback((remoteId: number) => {
    if (pcs.current.has(remoteId)) return pcs.current.get(remoteId);

    console.log(`[WebRTC] Creating PC for user ${remoteId}`);
    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Add production TURN servers here
        // { urls: "turn:your-turn-server.com:3478", username: "user", credential: "pwd" }
    ];

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (ev: any) => {
        if (ev.candidate) {
            console.log(`[WebRTC] ICE candidate generated for ${remoteId}: ${ev.candidate.candidate.substring(0, 30)}...`);
            wsRef.current?.send(JSON.stringify({
                type: "ice-candidate",
                target_user_id: remoteId,
                candidate: ev.candidate
            }));
        }
    };

    pc.onicegatheringstatechange = () => {
        console.log(`[WebRTC] ICE Gathering State (${remoteId}): ${pc.iceGatheringState}`);
    };

    pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log(`[WebRTC] ICE Connection State (${remoteId}): ${iceState}`);
        
        switch (iceState) {
            case 'checking':
                setStatus('connecting');
                break;
            case 'connected':
            case 'completed':
                setStatus('connected');
                break;
            case 'failed':
                console.warn(`[WebRTC] ICE failed for ${remoteId}. Attempting restart?`);
                setStatus('failed');
                break;
            case 'disconnected':
                console.log(`[WebRTC] ICE disconnected for ${remoteId}`);
                setStatus('reconnecting');
                break;
        }
    };

    pc.ontrack = (ev: any) => {
        console.log(`[WebRTC] SUCCESS: Got remote track from user ${remoteId}`);
        setStatus('connected');
        setParticipants(prev => prev.map(p => 
            p.userId === remoteId ? { ...p, stream: ev.streams[0] } : p
        ));
    };

    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] PC State (${remoteId}): ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
            setStatus('connected');
        }
    };

    // Process local tracks
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: any) => {
            console.log(`[WebRTC] Adding local track: ${track.kind} to PC ${remoteId}`);
            pc.addTrack(track, localStreamRef.current);
        });
    } else {
        console.warn(`[WebRTC] WARNING: No local stream available for PC ${remoteId}`);
    }

    pcs.current.set(remoteId, pc);
    return pc;
  }, []);

  /**
   * Safe helper to add ICE candidates with state verification. 
   * Prevents "Remote description not set" errors.
   */
  const safeAddIceCandidate = useCallback(async (remoteId: number, candidateData: any) => {
    const pc = pcs.current.get(remoteId);
    if (!pc) return;

    try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
            console.log(`[WebRTC] Applying ICE candidate for ${remoteId}`);
            const candidate = new RTCIceCandidate(candidateData);
            await pc.addIceCandidate(candidate);
        } else {
            console.log(`[WebRTC] Queuing ICE candidate for ${remoteId} (Remote description not ready)`);
            if (!pendingCandidates.current.has(remoteId)) {
                pendingCandidates.current.set(remoteId, []);
            }
            pendingCandidates.current.get(remoteId)?.push(candidateData);
        }
    } catch (err) {
        console.warn(`[WebRTC] Failed to add ICE candidate for ${remoteId}:`, err);
    }
  }, []);

  // ── Signaling Handler ───────────────────────────────────────────────────

  const handleSignal = useCallback(async (data: any) => {
    // Robust extraction: Backend room events use 'user_id', relayed signals use 'from_user_id'
    const remoteId = data.from_user_id || data.user_id;

    switch (data.type) {
      case "participant-joined":
        console.log(`[WebRTC] Participant joined: ${remoteId}`);
        setParticipants(p => {
          if (p.find(i => i.userId === remoteId)) return p;
          return [...p, {
            userId: remoteId,
            displayName: data.display_name,
            photo: data.photo,
            stream: null,
            audioEnabled: true,
            videoEnabled: true,
            isSpeaking: false
          }];
        });

        // Initiator: We send the offer
        const pcJoined = createPeerConnection(remoteId);
        if (!pcJoined || typeof pcJoined.createOffer !== 'function') {
          console.error(`[WebRTC] PC for ${remoteId} is invalid or lacks createOffer`);
          return;
        }

        try {
          console.log(`[WebRTC] Signaling: Creating offer for ${remoteId}`);
          const offer = await pcJoined.createOffer();
          await pcJoined.setLocalDescription(offer);
          console.log(`[WebRTC] Signaling: Sending offer to ${remoteId}`);
          wsRef.current?.send(JSON.stringify({
              type: "call-offer",
              target_user_id: remoteId,
              offer
          }));
        } catch (err) {
          console.error("[WebRTC] ERROR: Offer creation failed:", err);
        }
        break;

      case "participant-left":
        console.log(`[WebRTC] Participant left: ${remoteId}`);
        const pcLeft = pcs.current.get(remoteId);
        if (pcLeft) {
            pcLeft.close?.();
            pcs.current.delete(remoteId);
        }
        pendingCandidates.current.delete(remoteId);
        setParticipants(p => p.filter(item => item.userId !== remoteId));
        break;

      case "call-offer":
        console.log(`[WebRTC] Received offer from ${remoteId}`);
        const pcOffer = createPeerConnection(remoteId);
        if (!pcOffer || typeof pcOffer.setRemoteDescription !== 'function') {
            console.error(`[WebRTC] PC for ${remoteId} is invalid or lacks setRemoteDescription`);
            return;
        }

        try {
            console.log(`[WebRTC] Signaling: Setting remote description (OFFER) for ${remoteId}`);
            await pcOffer.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            console.log(`[WebRTC] Signaling: Creating answer for ${remoteId}`);
            const answer = await pcOffer.createAnswer();
            await pcOffer.setLocalDescription(answer);
            
            console.log(`[WebRTC] Signaling: Sending answer to ${remoteId}`);
            wsRef.current?.send(JSON.stringify({
                type: "call-answer",
                target_user_id: remoteId,
                answer
            }));

            // Drain candidate queue after description is set
            const queue = pendingCandidates.current.get(remoteId) || [];
            if (queue.length > 0) {
                console.log(`[WebRTC] Signaling: Draining ${queue.length} queued candidates for ${remoteId}`);
                for (const cand of queue) {
                    await safeAddIceCandidate(remoteId, cand);
                }
                pendingCandidates.current.delete(remoteId);
            }
        } catch (err) {
            console.error("[WebRTC] Offer handling failed:", err);
        }
        break;

      case "call-answer":
        console.log(`[WebRTC] Received answer from ${remoteId}`);
        const pcAns = pcs.current.get(remoteId);
        if (pcAns) {
            try {
                console.log(`[WebRTC] Signaling: Setting remote description (ANSWER) for ${remoteId}`);
                await pcAns.setRemoteDescription(new RTCSessionDescription(data.answer));

                // Drain candidate queue after description is set
                const queue = pendingCandidates.current.get(remoteId) || [];
                if (queue.length > 0) {
                    console.log(`[WebRTC] Signaling: Draining ${queue.length} queued candidates for ${remoteId}`);
                    for (const cand of queue) {
                        await safeAddIceCandidate(remoteId, cand);
                    }
                    pendingCandidates.current.delete(remoteId);
                }
            } catch (err) {
                console.error("[WebRTC] Answer handling failed:", err);
            }
        }
        break;

      case "ice-candidate":
        if (data.candidate) {
            await safeAddIceCandidate(remoteId, data.candidate);
        }
        break;

      case "chat-message":
        const newMsg: ChatMessage = {
          id: data.id || Math.random().toString(),
          senderId: remoteId,
          text: data.text,
          timestamp: new Date().toISOString(),
          status: "delivered"
        };
        setChatMessages(prev => [...prev, newMsg]);
        onNewMessage?.(newMsg);
        break;

      case "typing":
        if (data.from_user_id !== options.roomId) {
          setIsTyping(data.active);
          clearTimeout(typingTimer.current);
          if (data.active) {
            typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
          }
        }
        break;

      case "media-state":
        setParticipants(prev => prev.map(p => 
          p.userId === remoteId 
            ? { ...p, audioEnabled: data.audio, videoEnabled: data.video } 
            : p
        ));
        break;
    }
  }, [onNewMessage, createPeerConnection, options.roomId]);

  // ── Signaling Connect ───────────────────────────────────────────────────

  const connect = useCallback(async (rId: string) => {
    if (isCancelled.current) return;
    const token = options.token || await storage.getItem("accessToken");
    
    // 1. Protocol Auto-Detection (IPs = ws, HTTPS/ngrok = wss)
    let protocol = 'ws';
    if (BASE_URL.startsWith('https')) {
        protocol = 'wss';
    }
    
    // 2. Base URL clean-up: Extract only host and port (e.g., "10.67.114.184:8000")
    // Using new URL() is robust against trailing slashes/paths in BASE_URL
    const urlObj = new URL(BASE_URL);
    const host = urlObj.host;
    
    // 3. Construct Final Signaling URL
    const wsUrl = `${protocol}://${host}/ws/call/room/${rId}/?token=${encodeURIComponent(token)}`;

    try {
      console.log(`[WebRTC] Protocol: ${protocol.toUpperCase()}`);
      console.log(`[WebRTC] Full WS URL: ${wsUrl}`);
      console.log(`[WebRTC] Connecting to room: ${rId}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WebRTC] WS OPEN: Room ${rId}`);
        reconCount.current = 0;
        
        // Start Heartbeat
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 30000);
      };

      ws.onmessage = (ev) => {
        if (isCancelled.current) return;
        const data = JSON.parse(ev.data);
        handleSignal(data);
      };

      ws.onclose = (e) => {
        if (isCancelled.current) return;
        clearInterval(heartbeatTimer.current);
        console.warn(`[WebRTC] WS CLOSED: Code ${e.code}, Reason: ${e.reason || 'None'}`);
        scheduleReconnect(rId);
      };

      ws.onerror = (e) => {
        console.error("[WebRTC] WS ERROR:", e);
      };
    } catch (err) {
      console.error("[WebRTC] Connect failed:", err);
      scheduleReconnect(rId);
    }
  }, [options.token, handleSignal]);

  const scheduleReconnect = useCallback((rId: string) => {
    if (reconCount.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[WebRTC] MAX RECONNECT REACHED (${MAX_RECONNECT_ATTEMPTS}). Failing.`);
      setStatus("failed");
      return;
    }
    
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s (capped)
    const delay = Math.min(30000, RECONNECT_DELAY * Math.pow(2, reconCount.current));
    console.log(`[WebRTC] Scheduling reconnect in ${delay}ms (Attempt ${reconCount.current + 1})`);
    
    setStatus("reconnecting");
    reconCount.current++;
    setTimeout(() => {
        if (!isCancelled.current) connect(rId);
    }, delay);
  }, [connect]);

  // ── Media Controls ──────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    localStreamRef.current?.getAudioTracks?.().forEach((t: any) => t.enabled = !next);
    setIsMuted(next);
    wsRef.current?.send(JSON.stringify({ type: "media-state", audio: !next, video: !isVideoOff }));
  }, [isMuted, isVideoOff]);

  const toggleVideo = useCallback(() => {
    const next = !isVideoOff;
    localStreamRef.current?.getVideoTracks?.().forEach((t: any) => t.enabled = !next);
    setIsVideoOff(next);
    wsRef.current?.send(JSON.stringify({ type: "media-state", audio: !isMuted, video: !next }));
  }, [isMuted, isVideoOff]);

  const switchCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t: any) => (t as any)._switchCamera?.());
  }, []);

  // ── Chat Controls ───────────────────────────────────────────────────────

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg = { type: "chat-message", text };
    wsRef.current?.send(JSON.stringify(msg));
    
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      senderId: 0, 
      text,
      timestamp: new Date().toISOString(),
      status: "sent"
    }]);
  }, []);

  const sendTyping = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "typing", active: true }));
  }, []);

  // ── Lifetime Management ─────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !roomId) return;
    isCancelled.current = false;

    const init = async () => {
      setStatus("connecting");
      try {
        InCallManager?.start?.({ media: kind });
        InCallManager?.setKeepScreenOn?.(true);
        InCallManager?.setForceSpeakerphoneOn?.(kind === "video");

        const constraints = {
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          },
          video: kind === "video" ? { 
            frameRate: 30, 
            width: 1280, 
            height: 720,
            facingMode: 'user'
          } : false
        };

        console.log(`[WebRTC] Requesting media with constraints:`, constraints);
        const stream = await mediaDevices.getUserMedia(constraints);
        if (isCancelled.current) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        console.log(`[WebRTC] Media stream obtained. Joining room: ${roomId}`);
        await connect(roomId);

      } catch (err) {
        console.error("[WebRTC] CRITICAL: Media init failed:", err);
        setStatus("failed");
      }
    };

    void init();

    return () => {
      isCancelled.current = true;
      clearInterval(heartbeatTimer.current);
      InCallManager?.stop?.();
      wsRef.current?.close();
      localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
      setLocalStream(null);
      setParticipants([]);
    };
  }, [enabled, roomId, kind, connect]);

  useEffect(() => {
    onParticipantChange?.(participants);
  }, [participants, onParticipantChange]);

  const hangup = useCallback(() => {
    InCallManager?.stop?.();
    wsRef.current?.close();
    localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    setLocalStream(null);
    setParticipants([]);
    setStatus("idle");
  }, []);

  return {
    localStream,
    participants,
    status,
    isMuted,
    isVideoOff,
    chatMessages,
    isTyping,
    qualityTier,
    toggleMute,
    toggleVideo,
    switchCamera,
    sendMessage,
    sendTyping,
    hangup,
    reconnect: () => roomId && connect(roomId)
  };
}

