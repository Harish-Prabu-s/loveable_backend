import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import io, { Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

// === WebRTC Imports & Polyfills ===
let mediaDevices: any;
let MediaStream: any;
let InCallManager: any;

if (Platform.OS !== "web") {
  try {
    const webrtc = require("@videosdk.live/react-native-webrtc");
    mediaDevices = webrtc.mediaDevices;
    MediaStream = webrtc.MediaStream;
    // VERY IMPORTANT: Polyfill for mediasoup-client detection
    global.RTCPeerConnection = webrtc.RTCPeerConnection;
    global.RTCIceCandidate = webrtc.RTCIceCandidate;
    global.RTCSessionDescription = webrtc.RTCSessionDescription;
    const nav = global.navigator as any;
    if (nav) {
      if (!nav.mediaDevices) {
        Object.defineProperty(nav, 'mediaDevices', {
          value: webrtc.mediaDevices,
          configurable: true,
          writable: true,
          enumerable: true
        });
      }
    } else {
      (global as any).navigator = { mediaDevices: webrtc.mediaDevices };
    }

    const icm = require("@videosdk.live/react-native-incallmanager");
    InCallManager = icm.default ?? icm;
  } catch (e) {
    console.warn("Native WebRTC failed to load", e);
  }
} else {
  mediaDevices = (navigator as any).mediaDevices;
  MediaStream = (window as any).MediaStream;
}

export interface Participant {
  userId: number;
  displayName?: string;
  photo?: string | null;
  videoTrack?: any | null;
  audioTrack?: any | null;
  isSpeaking?: boolean;
}

export function useEnterpriseCall(roomId: string) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'failed' | 'ended'>('connecting');
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [participants, setParticipants] = useState<Map<number, Participant>>(new Map());
  const [messages, setMessages] = useState<{ userId: number, text: string, id: string }[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const producersRef = useRef<Map<string, any>>(new Map());
  const consumersRef = useRef<Map<string, any>>(new Map());

  // Helper to start InCallManager for voice/video optimizations
  const configureCallAudio = () => {
    if (InCallManager) {
      InCallManager.start({ media: 'video' });
      InCallManager.setKeepScreenOn(true);
      InCallManager.setForceSpeakerphoneOn(true);
    }
  };

  const getSignalingURL = () => {
    // SFU Server is assumed to be on the same host but port 3000, 
    // or defined in extra.sfuUrl
    return Constants.expoConfig?.extra?.sfuUrl || 'http://72.62.195.63:3000';
  };

  const initCall = useCallback(async () => {
    if (!roomId || !user) return;
    try {
      configureCallAudio();
      
      const sfuUrl = getSignalingURL();
      const socket = io(sfuUrl, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[SFU] Connected to Enterprise Server');
        
        socket.emit('joinRoom', { 
            roomId, 
            userId: user.id,
            profileData: { displayName: user.displayName, photo: user.photo }
        }, async (response: any) => {
          if (response.error) {
            console.error('[SFU] Join Room Error:', response.error);
            setStatus('failed');
            return;
          }

          // 1. Initialize Mediasoup Device
          const device = new Device();
          await device.load({ routerRtpCapabilities: response.rtpCapabilities });
          deviceRef.current = device;
          
          // Add existing peers
          setParticipants(prev => {
            const next = new Map(prev);
            for (const p of response.peers) {
              next.set(p.userId, { userId: p.userId, ...p.profileData });
            }
            return next;
          });

          // 2. Create Transports
          await createTransports(device, socket);
          
          // 3. Start local media & produce
          await startProducing();
          
          setStatus('connected');
        });
      });

      // --- Network Events ---
      socket.on('newProducer', async ({ producerId, userId, kind, appData }) => {
        console.log(`[SFU] New Producer from ${userId} (${kind})`);
        await consumeMedia(producerId, userId, kind);
      });

      socket.on('peerJoined', ({ userId, profileData }) => {
        setParticipants(prev => {
          const next = new Map(prev);
          next.set(userId, { userId, ...profileData });
          return next;
        });
      });

      socket.on('peerLeft', ({ userId }) => {
        setParticipants(prev => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      });

      socket.on('chatMessage', (msg) => {
        setMessages(prev => [...prev, { ...msg, id: Math.random().toString() }]);
      });

      socket.on('disconnect', () => {
        setStatus('failed');
      });

    } catch (e) {
      console.error('[SFU] Initialization Error', e);
      setStatus('failed');
    }
  }, [roomId, user]);

  useEffect(() => {
    initCall();
    return () => {
      endCall();
    };
  }, [roomId]);

  // --- Core Mediasoup Functions ---
  
  const createTransports = async (device: Device, socket: Socket) => {
    // Send Transport
    socket.emit('createWebRtcTransport', { producing: true, consuming: false }, async (response: any) => {
      if (response.error) throw new Error(response.error);
      const transport = device.createSendTransport(response.params);
      sendTransportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectTransport', { transportId: transport.id, dtlsParameters }, (resp: any) => {
          if (resp?.error) errback(new Error(resp.error));
          else callback();
        });
      });

      transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        socket.emit('produce', { transportId: transport.id, kind, rtpParameters, appData }, (resp: any) => {
          if (resp?.error) errback(new Error(resp.error));
          else callback({ id: resp.id });
        });
      });
    });

    // Receive Transport
    socket.emit('createWebRtcTransport', { producing: false, consuming: true }, async (response: any) => {
      if (response.error) throw new Error(response.error);
      const transport = device.createRecvTransport(response.params);
      recvTransportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectTransport', { transportId: transport.id, dtlsParameters }, (resp: any) => {
          if (resp?.error) errback(new Error(resp.error));
          else callback();
        });
      });
    });
  };

  const startProducing = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
         audio: true,
         video: { facingMode: 'user', width: 640, height: 480, frameRate: 30 }
      });
      setLocalStream(stream);

      const sendTransport = sendTransportRef.current;
      if (!sendTransport) return;

      // Produce Video
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const vp = await sendTransport.produce({ track: videoTrack, encodings: [{ maxBitrate: 500000 }] });
        producersRef.current.set(vp.id, vp);
      }

      // Produce Audio
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const ap = await sendTransport.produce({ track: audioTrack });
        producersRef.current.set(ap.id, ap);
      }
    } catch (err) {
      console.warn('Media Error:', err);
    }
  };

  const consumeMedia = async (producerId: string, userId: number, kind: string) => {
    const device = deviceRef.current;
    const socket = socketRef.current;
    const recvTransport = recvTransportRef.current;
    if (!device || !socket || !recvTransport) return;

    socket.emit('consume', {
      producerId,
      rtpCapabilities: device.rtpCapabilities,
      transportId: recvTransport.id
    }, async (response: any) => {
      if (response.error) return console.error('Consume Error', response.error);

      const consumer = await recvTransport.consume({
        id: response.params.id,
        producerId: response.params.producerId,
        kind: response.params.kind,
        rtpParameters: response.params.rtpParameters
      });

      consumersRef.current.set(consumer.id, consumer);

      // Add track to participant
      setParticipants(prev => {
        const next = new Map(prev);
        const pt = next.get(userId) || { userId };
        
        // Since React Native WebRTC handles MediaStreams instead of bare tracks for UI:
        let combinedStream = (pt as any).stream || new MediaStream();
        combinedStream.addTrack(consumer.track);

        if (kind === 'video') pt.videoTrack = consumer.track;
        if (kind === 'audio') pt.audioTrack = consumer.track;
        (pt as any).stream = combinedStream;

        next.set(userId, pt);
        return next;
      });

      // Resume from pause (Mediasoup starts consumers paused)
      socket.emit('resumeConsumer', { consumerId: consumer.id }, () => {});
    });
  };

  const sendMessage = (text: string) => {
    if (socketRef.current) {
        socketRef.current.emit('chatMessage', { text });
        if(user) {
            setMessages(prev => [...prev, { userId: user.id, text, id: Math.random().toString() }]);
        }
    }
  };

  const endCall = () => {
    socketRef.current?.disconnect();
    localStream?.getTracks().forEach((track: any) => track.stop());
    setLocalStream(null);
    setStatus('ended');
    if (InCallManager) {
        InCallManager.stop();
    }
  };

  return {
    status,
    localStream,
    participants: Array.from(participants.values()),
    messages,
    sendMessage,
    endCall
  };
}
