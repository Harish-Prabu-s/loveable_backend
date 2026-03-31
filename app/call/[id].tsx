import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, StatusBar, Alert, Platform, PermissionsAndroid, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useWebRTC } from '@/hooks/useWebRTC';
import { callsApi } from '@/api/vibely';
import { useTheme } from '@/context/ThemeContext';
import { ParticipantView } from '@/components/video/ParticipantView';
import { MeetingControls } from '@/components/video/MeetingControls';
import { CallChat } from '@/components/video/CallChat';
import { storage } from '@/lib/storage';

export default function CallScreen() {
    const params = useLocalSearchParams<{
        id: string;          // User ID of the other person
        sessionId?: string;
        roomId?: string;
        isIncoming?: string;
        callType?: string;
        calleeName?: string;
        calleePhoto?: string;
    }>();

    const isIncoming = params.isIncoming === 'true';
    const callKind: 'audio' | 'video' = ((params.callType || 'VOICE').toUpperCase() === 'VIDEO') ? 'video' : 'audio';

    // ── Room ID state ──────────────────────────────────────────────────────────
    // For callers: starts null, gets set after callsApi.initiate()
    // For receivers: immediately available from params
    const [roomId, setRoomId] = useState<string | null>(params.roomId || null);
    const [sessionId, setSessionId] = useState<number | null>(
        params.sessionId ? Number(params.sessionId) : null
    );
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [screenStatus, setScreenStatus] = useState<'requesting' | 'calling' | 'active' | 'ended'>('requesting');

    // ── WebRTC hook — only enabled once we have permissions + roomId ──────────
    const {
        localStream,
        participants,
        status: rtcStatus,
        isMuted,
        isVideoOff,
        chatMessages,
        toggleMute,
        toggleVideo,
        switchCamera,
        sendMessage,
        hangup,
    } = useWebRTC({
        roomId: roomId ?? undefined,
        enabled: permissionsGranted && !!roomId,
        kind: callKind,
    });

    // ── Map RTC status → screen status ────────────────────────────────────────
    useEffect(() => {
        console.log(`[CallScreen] RTC status: ${rtcStatus} | roomId: ${roomId}`);
        if (rtcStatus === 'connected') {
            setScreenStatus('active');
        } else if (rtcStatus === 'failed') {
            setScreenStatus('ended');
            setTimeout(() => router.replace('/(tabs)/discover'), 2500);
        }
    }, [rtcStatus]);

    // ── Call timer ────────────────────────────────────────────────────────────
    useEffect(() => {
        let timer: any;
        if (screenStatus === 'active') {
            timer = setInterval(() => setElapsed(e => e + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [screenStatus]);

    // ── Permissions + Room Setup ───────────────────────────────────────────────
    useEffect(() => {
        async function setupCall() {
            // 1. Request permissions
            if (Platform.OS === 'android') {
                const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
                if (callKind === 'video') {
                    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
                }
                const grants = await PermissionsAndroid.requestMultiple(permissions);
                const audioOk = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
                const cameraOk = callKind === 'audio' || grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

                if (!audioOk || !cameraOk) {
                    Alert.alert('Permissions Required', 'Camera and microphone permissions are required for calls.');
                    router.back();
                    return;
                }
            }
            setPermissionsGranted(true);

            // 2. CALLER: create the call session and get a roomId from the backend
            if (!isIncoming && !roomId) {
                setScreenStatus('calling');
                try {
                    // Generate a unique room ID (same logic as before, but now we
                    // properly wait for it before enabling the WebRTC hook)
                    const generatedRoomId = Math.random().toString(36).substring(2, 9);
                    const rawType = (params.callType || 'VOICE').toUpperCase();
                    const type = (rawType === 'AUDIO' ? 'VOICE' : rawType) as 'VOICE' | 'VIDEO';

                    const session = await callsApi.initiate(Number(params.id), type, generatedRoomId);
                    setSessionId(session.id);
                    // Only NOW do we set the roomId — this triggers useWebRTC to connect
                    setRoomId(generatedRoomId);
                    console.log(`[CallScreen] Outgoing call initiated. Session: ${session.id}, Room: ${generatedRoomId}`);
                } catch (error: any) {
                    const msg = error?.response?.data?.detail || 'Could not start call. Please try again.';
                    Alert.alert('Call Failed', msg);
                    router.back();
                }
            } else if (isIncoming && roomId) {
                // RECEIVER: roomId already set from params, just start connecting
                setScreenStatus('calling');
                console.log(`[CallScreen] Incoming call accepted. Joining room: ${roomId}`);
            }
        }

        setupCall();
    }, []); // Run once on mount

    // ── Hangup handler ────────────────────────────────────────────────────────
    const handleHangup = async () => {
        hangup();
        if (sessionId) {
            callsApi.end(sessionId).catch(() => {});
        }
        router.replace('/(tabs)/discover');
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    // ── Loading States ────────────────────────────────────────────────────────
    if (screenStatus === 'requesting') {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Requesting Permissions...</Text>
            </View>
        );
    }

    // ── Main Call UI ──────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

            {/* ─ Video Grid ─ */}
            <View style={styles.videoGrid}>
                {participants.length > 0 ? (
                    <View style={styles.gridInner}>
                        {participants.map((p, index) => (
                            <ParticipantView
                                key={p.userId || `p-${index}`}
                                stream={p.stream}
                                displayName={p.displayName}
                                videoEnabled={p.videoEnabled}
                                audioEnabled={p.audioEnabled}
                                photo={p.photo}
                            />
                        ))}
                    </View>
                ) : (
                    // Waiting for the other person to join
                    <LinearGradient
                        colors={['#0F172A', '#1E1B4B', '#0F172A']}
                        style={styles.waitingContainer}
                    >
                        <View style={styles.waitingInner}>
                            <MotiView
                                from={{ scale: 0.95, opacity: 0.6 }}
                                animate={{ scale: 1.05, opacity: 1 }}
                                transition={{ type: 'timing', duration: 1200, loop: true, repeatReverse: true }}
                                style={styles.avatarWrapper}
                            >
                                {/* Pulse Ring */}
                                <View style={styles.pulseRing} />
                                <Image
                                    source={{ uri: params.calleePhoto || 'https://via.placeholder.com/150' }}
                                    style={styles.avatarLarge}
                                />
                            </MotiView>

                            <Text style={styles.calleeName2}>{params.calleeName || 'User'}</Text>

                            {/* Status line */}
                            <View style={styles.statusRow}>
                                <View style={styles.statusDot} />
                                <Text style={styles.waitingText}>
                                    {rtcStatus === 'connecting'
                                        ? isIncoming ? 'Joining call...' : 'Calling...'
                                        : rtcStatus === 'reconnecting'
                                            ? 'Reconnecting...'
                                            : 'Waiting for response...'}
                                </Text>
                            </View>

                            <Text style={styles.callTypeTag}>
                                {callKind === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                            </Text>
                        </View>
                    </LinearGradient>
                )}

                {/* Local stream PiP */}
                {localStream && (
                    <View style={[
                        styles.localStreamContainer,
                        participants.length > 0 ? styles.localStreamPip : styles.localStreamFull
                    ]}>
                        <ParticipantView
                            stream={localStream}
                            displayName="Me"
                            isLocal={true}
                            videoEnabled={!isVideoOff}
                            audioEnabled={!isMuted}
                        />
                    </View>
                )}
            </View>

            {/* ─ Header overlay ─ */}
            <SafeAreaView style={styles.headerOverlay}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleHangup}>
                        <MaterialCommunityIcons name="chevron-down" size={28} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{params.calleeName || 'User'}</Text>
                        <Text style={styles.statusText}>
                            {screenStatus === 'active'
                                ? formatTime(elapsed)
                                : rtcStatus === 'connecting'
                                    ? 'Connecting...'
                                    : rtcStatus === 'reconnecting'
                                        ? 'Reconnecting...'
                                        : isIncoming ? 'Joining...' : 'Calling...'}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.iconBtn} onPress={() => setShowChat(v => !v)}>
                        <MaterialCommunityIcons name="chat" size={22} color={showChat ? '#6366F1' : '#FFF'} />
                        {chatMessages.length > 0 && !showChat && <View style={styles.chatBadge} />}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* ─ Chat overlay ─ */}
            {showChat && (
                <View style={styles.chatOverlay}>
                    <CallChat messages={chatMessages as any} onSendMessage={sendMessage} />
                </View>
            )}

            {/* ─ Controls ─ */}
            {!showChat && (
                <MeetingControls
                    micOn={!isMuted}
                    webcamOn={!isVideoOff}
                    onToggleMic={toggleMute}
                    onToggleWebcam={toggleVideo}
                    onHangup={handleHangup}
                    onSwitchCamera={switchCamera}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#9CA3AF', marginTop: 16, fontSize: 15 },

    videoGrid: { flex: 1 },

    // Waiting / calling screen
    waitingContainer: { flex: 1 },
    waitingInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    avatarWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    pulseRing: {
        position: 'absolute',
        width: 165,
        height: 165,
        borderRadius: 82.5,
        borderWidth: 2,
        borderColor: '#6366F1',
        opacity: 0.5,
    },
    avatarLarge: {
        width: 145,
        height: 145,
        borderRadius: 72.5,
        borderWidth: 3,
        borderColor: '#6366F1',
    },
    calleeName2: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    waitingText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
    callTypeTag: { color: '#6366F1', fontSize: 13, fontWeight: '600', marginTop: 4 },

    // Local PiP
    localStreamContainer: { position: 'absolute', overflow: 'hidden' },
    localStreamPip: {
        bottom: 120,
        right: 16,
        width: 110,
        height: 165,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    localStreamFull: { top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },

    // Grid for remote participants
    gridInner: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Header
    headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    iconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
    },
    headerInfo: { alignItems: 'center' },
    headerName: { fontSize: 17, fontWeight: '700', color: '#FFF' },
    statusText: { fontSize: 12, color: '#CBD5E1', marginTop: 2 },

    chatBadge: {
        position: 'absolute',
        top: 7,
        right: 7,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6366F1',
    },
    chatOverlay: {
        position: 'absolute',
        top: 90,
        bottom: 110,
        left: 0,
        right: 0,
        zIndex: 10,
    },
});
