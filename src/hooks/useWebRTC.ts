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

interface UseWebRTCOptions {
  roomId?: number;
  enabled: boolean;
  kind: WebRTCCallKind;
  isCaller?: boolean;
}

interface UseWebRTCResult {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCResult {
  const { roomId, enabled, kind } = options;
  const isCaller = options.isCaller ?? true;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Your browser does not support camera/microphone access.");
      return;
    }

    let isCancelled = false;

    const signalingBase =
      typeof process !== "undefined" &&
      (process as any).env &&
      (process as any).env.VITE_SIGNALING_URL
        ? String((process as any).env.VITE_SIGNALING_URL)
        : `ws://${window.location.hostname}:9000`;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) {
        return;
      }
      if (!isCancelled) {
        setRemoteStream(event.streams[0]);
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

        const stream = await navigator.mediaDevices.getUserMedia({
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
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => {
          try {
            s.track?.stop();
          } catch {
          }
        });
        pcRef.current.close();
        pcRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
        }
        wsRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [enabled, roomId, kind, isCaller]);

  return { localStream, remoteStream };
}
