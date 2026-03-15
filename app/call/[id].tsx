import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Image, StatusBar, Alert, Platform, PermissionsAndroid
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, withSpring } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { callsApi, monetizationApi } from '@/api/vibely';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useWebRTC } from '@/hooks/useWebRTC';
import { RTCView } from '@/utils/webrtc';
import { MotiTransitions, smoothTiming } from '@/utils/animations';

function CallScreen() {
    const params = useLocalSearchParams<{
        id: string;
        callType: string;
        calleeName?: string;
        calleePhoto?: string;
        sessionId?: string;
        isIncoming?: string;
    }>();
    const calleeId = Number(params.id);
    const initType = (params.callType || 'audio').toLowerCase();
    const calleeName = params.calleeName || 'User';
    const calleePhoto = params.calleePhoto || null;

    const [callType, setCallType] = useState<'audio' | 'video'>(initType as 'audio' | 'video');
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [status, setStatus] = useState<'connecting' | 'active' | 'ended'>('connecting');
    const [elapsed, setElapsed] = useState(0);
    const [coinRate, setCoinRate] = useState(0);
    const [showGifts, setShowGifts] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const pulseScale = useSharedValue(1);

    const {
        localStream,
        remoteStream,
        toggleMute,
        toggleVideo,
        switchCamera,
        isMuted,
        isVideoOff,
        sendCallEnd
    } = useWebRTC({
        roomId: sessionId ?? undefined,
        enabled: status !== 'ended',
        kind: callType,
        isCaller: !params.sessionId, // If we started with sessionId in params, we are the callee
    });

    // Pulse animation for "connecting" state using Reanimated
    useEffect(() => {
        if (status === 'connecting') {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // infinite
                true // reverse
            );
        } else {
            pulseScale.value = smoothTiming(1);
        }
    }, [status]);

    // Request permissions and initiate call on mount
    useEffect(() => {
        const checkPermissionsAndInit = async () => {
            if (Platform.OS === 'android') {
                try {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    ]);
                    if (
                        granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
                        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        Alert.alert('Permissions Required', 'Camera and microphone access is needed.');
                        router.back();
                        return;
                    }
                } catch (err) {
                    console.warn(err);
                }
            }

            try {
                // Determine rate
                const pricing = await monetizationApi.getPricing(callType === 'audio' ? 'audio_call' : 'video_call');
                setCoinRate(Number(pricing.cost) || 0);

                if (params.sessionId) {
                    setSessionId(Number(params.sessionId));
                    setStatus('active');
                } else {
                    const backendCallType = callType === 'audio' ? 'VOICE' : 'VIDEO';
                    const session = await callsApi.initiate(calleeId, backendCallType);
                    setSessionId(session.id);
                    setStatus('active');
                }
            } catch (e: any) {
                Alert.alert('Call Failed', e?.response?.data?.detail || 'Could not connect.');
                router.back();
            }
        };
        checkPermissionsAndInit();
    }, []);

    // Elapsed time counter
    useEffect(() => {
        // Technically it should be 'active' && remoteStream is present, but we'll start it once we successfully connect to our backend
        if (status === 'active') {
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [status]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const endCall = async () => {
        sendCallEnd();
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('ended');

        const closeAndNavigate = () => {
            // Smoothly replace to discover to prevent loops
            router.replace('/(tabs)/discover');
        };

        if (sessionId) {
            try {
                const result = await callsApi.end(sessionId);
                Alert.alert(
                    'Call Ended',
                    `Duration: ${formatTime(result.duration_seconds || elapsed)}\nCoins spent: ${result.coins_spent || 0}`,
                    [{ text: 'OK', onPress: closeAndNavigate }]
                );
            } catch {
                closeAndNavigate();
            }
        } else {
            closeAndNavigate();
        }
    };

    const handleUpgradeToVideo = () => {
        setCallType('video');
    };

    const photoUri = calleePhoto
        ? (getMediaUrl(calleePhoto) || generateAvatarUrl(calleeId, null))
        : generateAvatarUrl(calleeId, null);

    const scaleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: pulseScale.value }],
        };
    });

    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 1 }}
            animate={{ opacity: status === 'ended' ? 0 : 1 }}
            transition={{ type: 'timing', duration: 400 }}
        >

            <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

            {/* Remote Video Background or Fallback */}
            {callType === 'video' && remoteStream && !isVideoOff ? (
                <RTCView
                    streamURL={remoteStream && typeof (remoteStream as any).toURL === 'function' ? (remoteStream as any).toURL() : (remoteStream as any)}
                    style={styles.remoteVideo}
                    objectFit="cover"
                />
            ) : (
                <LinearGradient colors={['#0F172A', '#020617', '#0F172A']} style={styles.remoteVideo}>
                    <View style={styles.bgCenter}>
                        <Animated.View style={[scaleStyle]}>
                            <Image source={{ uri: photoUri }} style={styles.calleeAvatarLg} />
                        </Animated.View>
                    </View>
                </LinearGradient>
            )}

            {/* Dark Overlay for better text legibility */}
            <View style={styles.overlay} />

            <SafeAreaView style={styles.safeArea}>

                {/* Header (Top) */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={styles.calleeName}>{calleeName}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.onlineDot, { backgroundColor: status === 'active' ? '#10B981' : '#64748B' }]} />
                            <Text style={styles.statusText}>
                                {status === 'connecting' ? 'Connecting…' : formatTime(elapsed)}
                            </Text>
                        </View>
                        {coinRate > 0 && status === 'active' && (
                            <View style={styles.coinRateChip}>
                                <Text style={styles.coinRateText}>{coinRate} coins/min</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ width: 40 }} />
                </View>

                {/* Local Video Picture-in-Picture */}
                {callType === 'video' && localStream && !isVideoOff && (
                    <View style={styles.localVideoContainer}>
                        <RTCView
                            streamURL={localStream && typeof (localStream as any).toURL === 'function' ? (localStream as any).toURL() : (localStream as any)}
                            style={styles.localVideo}
                            objectFit="cover"
                            mirror={true} // local usually mirrored
                        />
                    </View>
                )}

                {/* Gift Quick Panel */}
                {showGifts && (
                    <View style={styles.giftPanel}>
                        {['❤️', '🌹', '💎', '🎁', '⭐', '🔥'].map(emoji => (
                            <TouchableOpacity key={emoji} style={styles.giftEmoji}>
                                <Text style={styles.giftEmojiText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Bottom Controls */}
                <View style={styles.bottomControls}>
                    <View style={styles.actionsRow}>

                        <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 100 }}>
                            <TouchableOpacity style={[styles.iconBtn, isMuted && styles.iconBtnActive]} onPress={toggleMute} activeOpacity={0.7}>
                                <MaterialCommunityIcons name={isMuted ? 'microphone-off' : 'microphone'} size={28} color={isMuted ? '#000' : '#FFF'} />
                            </TouchableOpacity>
                        </MotiView>

                        <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 200 }}>
                            {callType === 'video' ? (
                                <TouchableOpacity style={[styles.iconBtn, isVideoOff && styles.iconBtnActive]} onPress={toggleVideo} activeOpacity={0.7}>
                                    <MaterialCommunityIcons name={isVideoOff ? 'video-off' : 'video'} size={28} color={isVideoOff ? '#000' : '#FFF'} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.iconBtn} onPress={handleUpgradeToVideo} activeOpacity={0.7}>
                                    <MaterialCommunityIcons name="video-plus" size={28} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </MotiView>

                        <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 300 }}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowGifts(v => !v)} activeOpacity={0.7}>
                                <MaterialCommunityIcons name="gift" size={26} color="#F59E0B" />
                            </TouchableOpacity>
                        </MotiView>

                        {callType === 'video' && !isVideoOff && (
                            <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 400 }}>
                                <TouchableOpacity style={styles.iconBtn} onPress={switchCamera} activeOpacity={0.7}>
                                    <MaterialCommunityIcons name="camera-flip" size={28} color="#FFF" />
                                </TouchableOpacity>
                            </MotiView>
                        )}

                        <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 500 }}>
                            <TouchableOpacity style={styles.endCallBtn} onPress={endCall} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" />
                            </TouchableOpacity>
                        </MotiView>
                    </View>
                </View>

            </SafeAreaView>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000'
    },
    remoteVideo: {
        ...StyleSheet.absoluteFillObject,
    },
    bgCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calleeAvatarLg: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: '#6366F1'
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backBtn: {
        width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20
    },
    headerInfo: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    calleeName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, color: '#E2E8F0', fontWeight: '500' },
    coinRateChip: {
        marginTop: 6,
        backgroundColor: 'rgba(251,191,36,0.2)',
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)'
    },
    coinRateText: { color: '#FCD34D', fontSize: 11, fontWeight: '600' },

    localVideoContainer: {
        position: 'absolute',
        top: 120,
        right: 16,
        width: 110,
        height: 160,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        backgroundColor: '#1E293B',
        elevation: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8
    },
    localVideo: {
        flex: 1
    },

    bottomControls: {
        paddingBottom: Platform.OS === 'ios' ? 20 : 30,
        paddingHorizontal: 20,
    },
    giftPanel: {
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 14,
        borderRadius: 24,
        marginBottom: 16
    },
    giftEmoji: {
        width: 44, height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center'
    },
    giftEmojiText: { fontSize: 22 },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 14,
        borderRadius: 40,
    },
    iconBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconBtnActive: {
        backgroundColor: '#FFFFFF',
    },
    endCallBtn: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#EF4444',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8
    }
});

export default CallScreen;
