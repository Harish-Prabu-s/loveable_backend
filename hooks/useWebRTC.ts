import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Platform } from 'react-native';
import {
  RTCPeerConnection as NativeRTCPeerConnection,
  RTCIceCandidate as NativeRTCIceCandidate,
  RTCSessionDescription as NativeRTCSessionDescription,
  mediaDevices as nativeMediaDevices,
  MediaStream as NativeMediaStream,
} from '@/src/utils/webrtc';

// Use native WebRTC on mobile, mocks on web
const RTCPeerConnection = NativeRTCPeerConnection;
const RTCIceCandidate = NativeRTCIceCandidate;
const RTCSessionDescription = NativeRTCSessionDescription;
const mediaDevices = nativeMediaDevices;
const MediaStream = NativeMediaStream;

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
  if (env?.EXPO_PUBLIC_SIGNALING_WS_URL) return String(env.EXPO_PUBLIC_SIGNALING_WS_URL).replace(/\/$/, "");
  if (env?.VITE_SIGNALING_WS_URL) return String(env.VITE_SIGNALING_WS_URL).replace(/\/$/, "");
  return "ws://localhost:9000";
}

interface UseWebRTCOptions {
  roomId?: number;
  enabled: boolean;
  kind: WebRTCCallKind;
  isCaller?: boolean;
}

interface UseWebRTCResult {
  localStream: any | null;
  remoteStream: any | null;
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

  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<any | null>(null);
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

    pc.ontrack = (event: any) => {
      if (!event.streams || event.streams.length === 0) return;
      if (!isCancelled) setRemoteStream(event.streams[0]);
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
              if (!pcRef.current || isCaller) return;
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              wsRef.current?.send(JSON.stringify({ type: "call-answer", roomId, sdp: answer }));
            } else if (data.type === "call-answer") {
              if (!pcRef.current || !isCaller) return;
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === "ice-candidate") {
              if (!pcRef.current || !data.candidate) return;
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.type === "call-end") {
              if (!isCancelled) setRemoteStream(null);
              pcRef.current?.close();
              pcRef.current = null;
            }
          } catch (e) {
            console.warn("Signaling error", e);
          }
        };

        ws.onclose = () => { wsRef.current = null; };
      } catch (e) {
        console.warn("Failed to connect signaling", e);
      }
    };

    const start = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: kind === "video" ? { frameRate: 30, facingMode: 'user' } : false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }

        setLocalStream(stream);
        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

        pc.onicecandidate = (event: any) => {
          if (!event.candidate || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          wsRef.current.send(JSON.stringify({
            type: "ice-candidate",
            roomId,
            candidate: event.candidate?.toJSON ? event.candidate.toJSON() : event.candidate,
          }));
        };

        connectSignaling();

        if (signalingBase && isCaller && wsRef.current) {
          wsRef.current.onopen = async () => {
            const offer = await pc.createOffer({});
            await pc.setLocalDescription(offer);
            wsRef.current?.send(JSON.stringify({ type: "call-offer", roomId, sdp: offer }));
          };
        }
      } catch (err: any) {
        console.warn(err);
        toast.error("Error accessing camera or microphone.");
      }
    };

    void start();

    return () => {
      isCancelled = true;
      if (wsRef.current?.readyState === WebSocket.OPEN && roomIdRef) {
        try { wsRef.current.send(JSON.stringify({ type: "call-end", roomId: roomIdRef })); } catch { }
      }
      try { wsRef.current?.close(); } catch { }
      wsRef.current = null;
      pcRef.current?.getSenders?.().forEach((s: any) => { try { s.track?.stop(); } catch { } });
      pcRef.current?.close();
      pcRef.current = null;
      setLocalStream((prev: any) => { prev?.getTracks?.().forEach((t: any) => t.stop?.()); return null; });
      setRemoteStream(null);
    };
  }, [enabled, roomId, kind, isCaller]);

  const sendCallEnd = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && roomId) {
      try { wsRef.current.send(JSON.stringify({ type: "call-end", roomId })); } catch { }
    }
  }, [roomId]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  }, [localStream]);

  const switchCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        if (typeof track._switchCamera === 'function') track._switchCamera();
      });
    }
  }, [localStream]);

  return { localStream, remoteStream, toggleMute, toggleVideo, switchCamera, isMuted, isVideoOff, sendCallEnd };
}
