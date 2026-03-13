import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type WebRTCCallKind = "voice" | "video";

type SignalingMessage =
  | {
      type: "call-offer";
      roomId: number;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "call-answer";
      roomId: number;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "ice-candidate";
      roomId: number;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: "call-end";
      roomId: number;
    };

function getSignalingUrl(): string {
  if (typeof process !== "undefined" && process.env?.VITE_SIGNALING_WS_URL) {
    return String(process.env.VITE_SIGNALING_WS_URL).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    let host = window.location.hostname || "localhost";
    if (host === "localhost" || host === "127.0.0.1") {
      const apiUrl = (typeof process !== "undefined" && process.env?.VITE_API_URL) ? process.env.VITE_API_URL : "";
      const m = apiUrl.match(/^https?:\/\/([^/:]+)/);
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
  isConnected: boolean;
  sendCallEnd: () => void;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCResult {
  const { roomId, enabled, kind } = options;
  const isCaller = options.isCaller ?? true;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const roomIdRef = useRef<number | undefined>(roomId);

  roomIdRef.current = roomId;

  const sendCallEnd = () => {
    const ws = wsRef.current;
    const rid = roomIdRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && rid) {
      try {
        ws.send(JSON.stringify({ type: "call-end", roomId: rid }));
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (!enabled || !roomId) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const mediaDevices =
      (navigator as any).mediaDevices ??
      ((window as any).ReactNativeWebView && (window as any).webkit?.mediaDevices);
    if (!mediaDevices?.getUserMedia) {
      toast.error("Camera/microphone access is not supported.");
      return;
    }

    let isCancelled = false;
    const signalingBase = getSignalingUrl();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) return;
      if (!isCancelled) setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      if (!isCancelled && pc.iceConnectionState === "connected") {
        setIsConnected(true);
      } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        if (!isCancelled) setIsConnected(false);
      }
    };

    const connectSignaling = () => {
      if (!signalingBase) {
        return;
      }
      try {
        const normalized = signalingBase.replace(/\/$/, "");
        const ws = new WebSocket(`${normalized}/call/${roomId}/`);
        wsRef.current = ws;

        ws.onmessage = async (event) => {
          try {
            const data: SignalingMessage = JSON.parse(event.data);
            if (data.roomId !== roomId) {
              return;
            }
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
          } catch {
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      } catch {
      }
    };

    const start = async () => {
      try {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
        const videoConstraints: MediaTrackConstraints | boolean =
          kind === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
              }
            : false;

        const stream = await mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const msg: SignalingMessage = {
            type: "ice-candidate",
            roomId,
            candidate: event.candidate.toJSON(),
          };
          wsRef.current.send(JSON.stringify(msg));
        };

        connectSignaling();

        if (signalingBase && isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const msg: SignalingMessage = {
            type: "call-offer",
            roomId,
            sdp: offer,
          };
          const sendOffer = () => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CONNECTING) {
              setTimeout(sendOffer, 200);
              return;
            }
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            wsRef.current.send(JSON.stringify(msg));
          };
          sendOffer();
        }
      } catch (err: any) {
        if (err?.name === "NotAllowedError") {
          toast.error("Camera/Mic permission denied. Please allow access.");
        } else if (err?.name === "NotFoundError") {
          toast.error("No camera/microphone found.");
        } else if (err?.name === "NotReadableError") {
          toast.error("Camera/Mic is already in use.");
        } else if (err?.name === "OverconstrainedError") {
          toast.error("Camera does not support the requested resolution.");
        } else if (err?.message) {
          toast.error(err.message);
        } else {
          toast.error("Media error");
        }
      }
    };

    void start();

    return () => {
      isCancelled = true;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && roomId) {
        try {
          wsRef.current.send(JSON.stringify({ type: "call-end", roomId }));
        } catch {
          /* ignore */
        }
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => {
          try {
            s.track?.stop();
          } catch {
            /* ignore */
          }
        });
        pcRef.current.close();
        pcRef.current = null;
      }
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setRemoteStream(null);
      setIsConnected(false);
    };
  }, [enabled, roomId, kind, isCaller]);

  return { localStream, remoteStream, isConnected, sendCallEnd };
}
