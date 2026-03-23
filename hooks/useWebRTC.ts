import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  RTCView,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from '@/utils/webrtc';

import { BASE_URL } from '@/api/client';

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
    fromCaller: boolean;
  }
  | {
    type: "call-end";
    roomId: number;
  }
  | {
    type: "callee-joined";
    roomId: number;
  };

function getSignalingUrl(): string {
  const protocol = BASE_URL.startsWith('https') ? 'wss' : 'ws';
  const cleanUrl = BASE_URL.replace(/^(wss?|https?):\/\//, '').replace(/\/api\/?$/, '');
  return `${protocol}://${cleanUrl}`;
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
        const ws = new WebSocket(`${normalized}/ws/call/room/${roomId}/`);
        wsRef.current = ws;

        ws.onmessage = async (event) => {
          try {
            const envelope = JSON.parse(event.data);
            const data: SignalingMessage = envelope.message || envelope; // Handle nested or flat
            if (data.roomId !== roomId) return;

            if (data.type === "callee-joined") {
              if (!pcRef.current || !isCaller) return;
              // Callee has joined the room, time to send the offer
              const offer = await pcRef.current.createOffer({});
              await pcRef.current.setLocalDescription(offer);
              wsRef.current?.send(JSON.stringify({ type: "call-offer", roomId, sdp: offer }));
            } else if (data.type === "call-offer") {
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
              // Ignore our own ICE candidates echoed back by the broadcast channel
              if (data.fromCaller === isCaller) return;
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

        ws.onopen = () => {
          if (!isCaller) {
            // Tell the caller we're ready to receive an offer
            wsRef.current?.send(JSON.stringify({ type: "callee-joined", roomId }));
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
            fromCaller: isCaller,
            candidate: event.candidate?.toJSON ? event.candidate.toJSON() : event.candidate,
          }));
        };

        connectSignaling();
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
