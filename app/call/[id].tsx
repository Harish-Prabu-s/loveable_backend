import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, StatusBar, Alert, Platform, PermissionsAndroid, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { useWebRTC } from '@/hooks/useWebRTC';
import { callsApi } from '@/api/vibely';
import { useTheme } from '@/context/ThemeContext';
import { ParticipantView } from '@/components/video/ParticipantView';
import { MeetingControls } from '@/components/video/MeetingControls';
import { CallChat } from '@/components/video/CallChat';

export default function CallScreen() {
    const params = useLocalSearchParams<{
        id: string; // User ID of the other person
        sessionId?: string;
        roomId?: string;
        isIncoming?: string;
        callType?: string;
        calleeName?: string;
        calleePhoto?: string;
    }>();
    
    const isIncoming = params.isIncoming === 'true';
    const [roomId, setRoomId] = useState<string | null>(params.roomId || null);
    const [showChat, setShowChat] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const { 
        localStream, 
        participants, 
        status: connectionStatus, 
        isMuted,
        isVideoOff,
        chatMessages: messages, 
        isTyping,
        sendMessage, 
        sendTyping,
        toggleMute: toggleMic, 
        toggleVideo: toggleCamera,
        hangup,
        reconnect: startCall
    } = useWebRTC({
        roomId: roomId || undefined,
        enabled: !!roomId,
        kind: (params.callType === 'video' || params.callType === 'VIDEO') ? 'video' : 'audio',
    });

    const [status, setStatus] = useState<'connecting' | 'active' | 'ended'>('connecting');

    useEffect(() => {
        if (connectionStatus === 'connected') {
            setStatus('active');
        } else if (connectionStatus === 'failed') {
            setStatus('ended');
            setTimeout(() => router.replace('/(tabs)/discover'), 1500);
        }
    }, [connectionStatus]);


    useEffect(() => {
        let timer: any;
        if (status === 'active') {
            timer = setInterval(() => setElapsed(e => e + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [status]);

    useEffect(() => {
        async function setupCall() {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
                if (granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
                    granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert('Permissions Required', 'Camera and mic permissions are required.');
                    router.back();
                    return;
                }
            }

            if (!isIncoming && !roomId) {
                try {
                    const generatedRoomId = Math.random().toString(36).substring(7);
                    const rawType = (params.callType || 'VOICE').toUpperCase();
                    const type = (rawType === 'AUDIO' ? 'VOICE' : rawType) as 'VOICE' | 'VIDEO';
                    
                    await callsApi.initiate(Number(params.id), type, generatedRoomId);
                    setRoomId(generatedRoomId);
                    
                    // We'll wait a bit for the other party to join before starting call
                    // In a production app, we'd wait for a 'ready' signal from the server
                    setTimeout(() => startCall(), 2000); 
                } catch (error: any) {
                    Alert.alert('Call Failed', error?.response?.data?.detail || 'Could not start call');
                    router.back();
                }
            } else if (isIncoming && roomId) {
                // For incoming, we just join. The caller will send the offer.
                console.log('[CallScreen] Incoming call, joined room:', roomId);
            }
        }
        setupCall();
    }, [isIncoming, params.id]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    if (!roomId || status === 'connecting' && !localStream) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Initializing Call...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

            {/* Video Streams Grid */}
            <View style={styles.videoGrid}>
                {participants.length > 0 ? (
                    <View style={styles.gridInner}>
                        {/* If 1 participant, show full screen. If more, show grid. */}
                        {participants.map((p) => (
                            <ParticipantView 
                                key={p.userId}
                                stream={p.stream} 
                                displayName={p.displayName} 
                            />
                        ))}
                    </View>
                ) : (
                    <LinearGradient colors={['#0F172A', '#020617', '#0F172A']} style={styles.remotePlaceholder}>
                        <View style={styles.bgCenter}>
                            <MotiView
                                from={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 1.1, opacity: 1 }}
                                transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                            >
                                <Image 
                                    source={{ uri: params.calleePhoto || 'https://via.placeholder.com/150' }} 
                                    style={styles.avatarLarge} 
                                />
                            </MotiView>
                            <Text style={styles.waitingText}>Calling {params.calleeName}...</Text>
                        </View>
                    </LinearGradient>
                )}
                
                {localStream && (
                    <View style={[
                        styles.localStreamContainer, 
                        participants.length > 0 ? styles.localStreamPip : styles.localStreamFull
                    ]}>
                        <ParticipantView 
                            stream={localStream} 
                            displayName="Me" 
                            isLocal={true} 
                        />
                    </View>
                )}
            </View>


            {/* Header */}
            <SafeAreaView style={styles.headerOverlay}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={hangup}>
                        <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={styles.calleeName}>{params.calleeName || 'User'}</Text>
                        <Text style={styles.statusText}>
                            {status === 'active' ? formatTime(elapsed) : 'Connecting...'}
                        </Text>
                    </View>
                    
                    <TouchableOpacity style={styles.chatBtn} onPress={() => setShowChat(!showChat)}>
                        <MaterialCommunityIcons name="chat" size={24} color={showChat ? "#6366F1" : "#FFF"} />
                        {messages.length > 0 && !showChat && <View style={styles.chatBadge} />}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Chat Overlay */}
            {showChat && (
                <View style={styles.chatOverlay}>
                    <CallChat messages={messages} onSendMessage={sendMessage} />
                </View>
            )}

            {/* Controls */}
            {!showChat && (
                <MeetingControls 
                    micOn={true} // Track these in local state if needed
                    webcamOn={params.callType === 'video' || params.callType === 'VIDEO'}
                    onToggleMic={toggleMic}
                    onToggleWebcam={toggleCamera}
                    onHangup={hangup}
                    onSwitchCamera={() => {}} // Could be implemented in hook
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
    videoGrid: { flex: 1 },
    remotePlaceholder: { flex: 1 },
    bgCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    avatarLarge: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#6366F1' },
    waitingText: { color: '#9CA3AF', marginTop: 20, fontSize: 14, fontWeight: '500' },
    localStreamContainer: { position: 'absolute', overflow: 'hidden' },
    localStreamPip: { bottom: 100, right: 20, width: 120, height: 180, borderRadius: 12, borderWidth: 1, borderColor: '#FFF' },
    localStreamFull: { top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
    headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
    headerInfo: { alignItems: 'center' },
    calleeName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    statusText: { fontSize: 13, color: '#E2E8F0', marginTop: 2 },
    chatBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
    chatBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
    chatOverlay: { position: 'absolute', top: 100, bottom: 100, left: 0, right: 0, zIndex: 10 },
    gridInner: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4
    }
});

