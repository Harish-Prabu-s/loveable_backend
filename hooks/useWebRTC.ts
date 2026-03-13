import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Platform } from 'react-native';

let RTCPeerConnection: any;
let RTCIceCandidate: any;
let RTCSessionDescription: any;
let mediaDevices: any;
let MediaStream: any;

if (Platform.OS !== 'web') {
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    mediaDevices = webrtc.mediaDevices;
    MediaStream = webrtc.MediaStream;
  } catch (e) {
    console.error('WebRTC native module not found. Please ensure you are running a Development Build.', e);
    // Fallback to mocks to prevent app crash
    RTCPeerConnection = class {
      close() { }
      setRemoteDescription() { return Promise.resolve(); }
      createAnswer() { return Promise.resolve({}); }
      setLocalDescription() { return Promise.resolve(); }
      addIceCandidate() { return Promise.resolve(); }
      createOffer() { return Promise.resolve({}); }
      addTrack() { }
      onicecandidate: any = null;
      ontrack: any = null;
    };
    RTCIceCandidate = class { constructor(obj: any) { Object.assign(this, obj); } };
    RTCSessionDescription = class { constructor(obj: any) { Object.assign(this, obj); } };
    mediaDevices = {
      getUserMedia: async () => ({
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        release: () => { }
      })
    };
    MediaStream = class {
      getTracks() { return []; }
      getAudioTracks() { return []; }
      getVideoTracks() { return []; }
      toURL() { return 'mock-url'; }
      release() { }
    };
  }
} else {
  // Web fallback mocks
  RTCPeerConnection = class {
    close() { }
    setRemoteDescription() { return Promise.resolve(); }
    createAnswer() { return Promise.resolve({}); }
    setLocalDescription() { return Promise.resolve(); }
    addIceCandidate() { return Promise.resolve(); }
    createOffer() { return Promise.resolve({}); }
    addTrack() { }
    onicecandidate: any = null;
    ontrack: any = null;
  };
  RTCIceCandidate = class { constructor(obj: any) { Object.assign(this, obj); } };
  RTCSessionDescription = class { constructor(obj: any) { Object.assign(this, obj); } };
  mediaDevices = {
    getUserMedia: async () => ({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    })
  };
  MediaStream = class {
    getTracks() { return []; }
    getAudioTracks() { return []; }
    getVideoTracks() { return []; }
    toURL() { return ''; }
  };
}

export type WebRTCCallKind = "audio" | "video" | "voice";

type SignalingMessage =
  | {
    type: "call-offer";
    roomId: number;
    sdp: any;
  }
  | {
    type: "call-answer";
    roomId: number;
    sdp: any;
  }
  | {
    type: "ice-candidate";
    roomId: number;
    candidate: any;
  }
  | {
    type: "call-end";
    roomId: number;
  };

function getSignalingUrl(): string {
  const env = typeof process !== "undefined" ? process.env : (global as any).__ENV__;
  if (env?.VITE_SIGNALING_WS_URL) return String(env.VITE_SIGNALING_WS_URL).replace(/\/$/, "");
  if (env?.EXPO_PUBLIC_SIGNALING_WS_URL) return String(env.EXPO_PUBLIC_SIGNALING_WS_URL).replace(/\/$/, "");
  if (typeof window !== "undefined") {
    let host = (window as any).location?.hostname || "localhost";
    if (host === "localhost" || host === "127.0.0.1") {
      const apiUrl = env?.VITE_API_URL || env?.EXPO_PUBLIC_API_URL || "";
      const m = String(apiUrl).match(/^https?:\/\/([^/:]+)/);
      if (m) host = m[1];
    }
    return `ws://${host}:9000`;
  }
  return "ws://localhost:9000";
}

interface UseWebRTCOptions {
  roomId?: number;
  enabled: boolean;
  kind: WebRTCCallKind;
  isCaller?: boolean;
}

interface UseWebRTCResult {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  sendCallEnd: () => void;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCResult {
  const { roomId, enabled, kind } = options;
  const isCaller = options.isCaller ?? true;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      return;
    }

    let isCancelled = false;
    const signalingBase = getSignalingUrl();
    const roomIdRef = roomId;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // @ts-ignore
    pc.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) {
        return;
      }
      if (!isCancelled) {
        setRemoteStream(event.streams[0]);
      }
    };

    const connectSignaling = () => {
      if (!signalingBase) return;

      try {
        const normalized = signalingBase.replace(/\/$/, "");
        const ws = new WebSocket(`${normalized}/ws/call/${roomId}/`);
        wsRef.current = ws;

        ws.onmessage = async (event) => {
          try {
            const data: SignalingMessage = JSON.parse(event.data);
            if (data.roomId !== roomId) return;

            if (data.type === "call-offer") {
              if (!pcRef.current) return;
              if (isCaller) return;
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              const msg: SignalingMessage = {
                type: "call-answer",
                roomId,
                sdp: answer,
              };
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              wsRef.current.send(JSON.stringify(msg));
            } else if (data.type === "call-answer") {
              if (!pcRef.current) return;
              if (!isCaller) return;
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === "ice-candidate") {
              if (!pcRef.current) return;
              if (data.candidate) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            } else if (data.type === "call-end") {
              if (!isCancelled) setRemoteStream(null);
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
            }
          } catch (e) {
            console.warn("Signaling error", e);
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      } catch (e) {
        console.warn("Failed to connect signaling", e);
      }
    };

    const start = async () => {
      try {
        const audioConstraints = true;
        const videoConstraints = kind === "video" ? {
          frameRate: 30,
          facingMode: 'user'
        } : false;

        const stream = await mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream as MediaStream);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream as MediaStream);
        });

        // @ts-ignore
        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const msg: SignalingMessage = {
            type: "ice-candidate",
            roomId,
            candidate: event.candidate?.toJSON ? event.candidate.toJSON() : event.candidate,
          };
          wsRef.current.send(JSON.stringify(msg));
        };

        connectSignaling();

        if (signalingBase && isCaller) {
          // Need a slight delay to ensure WS is connected before sending offer, or wait for onopen.
          wsRef.current!.onopen = async () => {
            const offer = await pc.createOffer({});
            await pc.setLocalDescription(offer);
            const msg: SignalingMessage = {
              type: "call-offer",
              roomId,
              sdp: offer,
            };
            wsRef.current?.send(JSON.stringify(msg));
          }
        }
      } catch (err: any) {
        console.warn(err);
        toast.error("Error accessing camera or microphone.");
      }
    };

    void start();

    return () => {
      isCancelled = true;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && roomIdRef) {
        try {
          wsRef.current.send(JSON.stringify({ type: "call-end", roomId: roomIdRef }));
        } catch { /* ignore */ }
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.getSenders?.().forEach((s: any) => {
          try { s.track?.stop(); } catch { /* ignore */ }
        });
        pcRef.current.close();
        pcRef.current = null;
      }
      setLocalStream((prev: any) => {
        prev?.getTracks?.().forEach((t: any) => t.stop?.());
        return null;
      });
      setRemoteStream(null);
    };
  }, [enabled, roomId, kind, isCaller]);

  const sendCallEnd = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && roomId) {
      try {
        ws.send(JSON.stringify({ type: "call-end", roomId }));
      } catch { /* ignore */ }
    }
  }, [roomId]);


  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  }, [localStream]);

  const switchCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        // react-native-webrtc provides _switchCamera on the track
        if (typeof (track as any)._switchCamera === 'function') {
          (track as any)._switchCamera();
        }
      });
    }
  }, [localStream]);

  return { localStream, remoteStream, toggleMute, toggleVideo, switchCamera, isMuted, isVideoOff, sendCallEnd };
}
