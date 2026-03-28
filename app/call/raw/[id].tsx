import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Alert, Platform, ActivityIndicator, Dimensions, ScrollView, TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStream,
    mediaDevices
} from '@/utils/webrtc.native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

export default function RawCallScreen() {
    const { id, calleeName } = useLocalSearchParams<{ id: string; calleeName: string }>();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'failed' | 'ended'>('connecting');
    const [messages, setMessages] = useState<{ id: string; text: string; sender: 'me' | 'peer' }[]>([]);
    const [inputText, setInputText] = useState('');
    const [showChat, setShowChat] = useState(false);

    const pc = useRef<RTCPeerConnection | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const dataChannel = useRef<any>(null);

    const setupMedia = useCallback(async () => {
        try {
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: 'user',
                    width: 640,
                    height: 480,
                    frameRate: 30
                }
            }) as MediaStream;
            setLocalStream(stream);
            return stream;
        } catch (e) {
            console.error('Failed to get media', e);
            Alert.alert('Permission Error', 'Cannot access camera or microphone');
            return null;
        }
    }, []);

    const sendMessage = () => {
        if (inputText.trim() && dataChannel.current?.readyState === 'open') {
            const msg = { id: Date.now().toString(), text: inputText, sender: 'me' as const };
            dataChannel.current.send(inputText);
            setMessages(prev => [...prev, msg]);
            setInputText('');
        }
    };

    useEffect(() => {
        let isCancelled = false;

        async function init() {
            const stream = await setupMedia();
            if (!stream || isCancelled) return;

            // 1. Initialize PeerConnection
            pc.current = new RTCPeerConnection(configuration);

            // 2. Add local tracks
            stream.getTracks().forEach(track => {
                pc.current?.addTrack(track, stream);
            });

            // 3. Handle incoming tracks
            (pc.current as any).ontrack = (event: any) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                    setStatus('connected');
                }
            };

            // 4. Setup Data Channel (for chat)
            dataChannel.current = pc.current.createDataChannel('chat');
            setupDataChannel(dataChannel.current);

            (pc.current as any).ondatachannel = (event: any) => {
                setupDataChannel(event.channel);
            };

            // 5. Handle ICE Candidates
            if (pc.current) {
                (pc.current as any).onicecandidate = (event: any) => {
                    if (event.candidate) {
                        sendSignal({ type: 'candidate', candidate: event.candidate });
                    }
                };
            }

            // 6. Connect to Signaling Server
            const SIGNALING_URL = `${Constants.expoConfig?.extra?.signalingUrl}/call/${id}` || `ws://localhost:9000/call/${id}`; 
            ws.current = new WebSocket(SIGNALING_URL);

            ws.current.onopen = async () => {
                console.log('[RTC] Signaling connected');
                // Trigger negotiation
                const offer = await pc.current?.createOffer({});
                await pc.current?.setLocalDescription(offer);
                sendSignal({ type: 'offer', sdp: offer });
            };

            ws.current.onmessage = async (e) => {
                const data = JSON.parse(e.data);
                console.log('[RTC] Received signal:', data.type);

                if (data.type === 'offer') {
                    await pc.current?.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    const answer = await pc.current?.createAnswer();
                    await pc.current?.setLocalDescription(answer);
                    sendSignal({ type: 'answer', sdp: answer });
                } else if (data.type === 'answer') {
                    await pc.current?.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } else if (data.type === 'candidate') {
                    await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            };
        }

        function setupDataChannel(channel: any) {
            channel.onopen = () => console.log('[RTC] Data channel open');
            channel.onmessage = (e: any) => {
                const msg = { id: Date.now().toString(), text: e.data, sender: 'peer' as const };
                setMessages(prev => [...prev, msg]);
            };
        }

        function sendSignal(data: any) {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(data));
            }
        }

        init();

        return () => {
            isCancelled = true;
            (localStream as any)?.release();
            pc.current?.close();
            ws.current?.close();
        };
    }, [id]);

    const endCall = () => {
        pc.current?.close();
        ws.current?.close();
        router.back();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            
            {/* Remote Video (Background) */}
            <View style={styles.remoteContainer}>
                {remoteStream ? (
                    <RTCView
                        streamURL={(remoteStream as any).toURL()}
                        style={styles.fullVideo}
                        objectFit="cover"
                    />
                ) : (
                    <LinearGradient colors={['#0F172A', '#020617']} style={styles.fullVideo}>
                        <ActivityIndicator color="#6366F1" size="large" />
                        <Text style={styles.waitingText}>Connecting to {calleeName}...</Text>
                    </LinearGradient>
                )}
            </View>

            {/* Local Video (PiP) */}
            <View style={styles.localContainer}>
                {localStream && (
                    <RTCView
                        streamURL={(localStream as any).toURL()}
                        style={styles.localVideo}
                        objectFit="cover"
                        zOrder={1}
                    />
                )}
            </View>

            {/* Controls */}
            <SafeAreaView style={styles.controls}>
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={endCall}>
                        <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.controlBtn, { backgroundColor: showChat ? '#6366F1' : 'rgba(255,255,255,0.2)' }]} 
                        onPress={() => setShowChat(!showChat)}
                    >
                        <MaterialCommunityIcons name="chat" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Chat Overlay */}
            <AnimatePresence>
                {showChat && (
                    <MotiView
                        from={{ translateY: 400 }}
                        animate={{ translateY: 0 }}
                        exit={{ translateY: 400 }}
                        style={styles.chatSheet}
                    >
                        <View style={styles.chatHeader}>
                            <Text style={styles.chatTitle}>In-Call Chat</Text>
                            <TouchableOpacity onPress={() => setShowChat(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.messageScroll}>
                            {messages.map(m => (
                                <View key={m.id} style={[styles.bubble, m.sender === 'me' ? styles.myBubble : styles.peerBubble]}>
                                    <Text style={styles.bubbleText}>{m.text}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Type a message..."
                                placeholderTextColor="#64748B"
                            />
                            <TouchableOpacity onPress={sendMessage}>
                                <MaterialCommunityIcons name="send" size={24} color="#6366F1" />
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                )}
            </AnimatePresence>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    remoteContainer: { ...StyleSheet.absoluteFillObject },
    fullVideo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    waitingText: { color: '#94A3B8', marginTop: 12 },
    localContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
        borderWidth: 2,
        borderColor: '#6366F1'
    },
    localVideo: { flex: 1 },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    controlBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    endBtn: { backgroundColor: '#EF4444' },
    chatSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 400,
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    chatTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    messageScroll: { flex: 1 },
    bubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' },
    myBubble: { alignSelf: 'flex-end', backgroundColor: '#6366F1' },
    peerBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B' },
    bubbleText: { color: '#FFF' },
    inputArea: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    input: { flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 22, paddingHorizontal: 15, color: '#FFF' }
});
