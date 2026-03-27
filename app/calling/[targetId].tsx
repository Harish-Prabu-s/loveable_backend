import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Image, StatusBar, Alert, Platform, PermissionsAndroid, FlatList, ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-native-sdk';
import { videoSdkApi, VIDEOSDK_TOKEN } from '@/api/videoSdk';
import { callsApi, monetizationApi } from '@/api/vibely';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useTheme } from '@/context/ThemeContext';
import { ParticipantView } from '@/components/video/ParticipantView';
import { MeetingControls } from '@/components/video/MeetingControls';

function MeetingView({ calleeName, photoUri, status, setStatus, elapsed, coinRate }: any) {
    const { participants, join, leave } = useMeeting({
        onMeetingJoined: () => {
            setStatus('active');
        },
        onMeetingLeft: () => {
            router.replace('/(tabs)/discover');
        },
        onError: (error) => {
            Alert.alert("Meeting Error", error.message);
            router.back();
        }
    });

    const participantIds = [...participants.keys()];

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

            {/* Main Participant Area (Meeting Grid) */}
            <View style={styles.meetingGrid}>
                {participantIds.length > 0 ? (
                    <FlatList
                        data={participantIds}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => <ParticipantView participantId={item} />}
                        numColumns={participantIds.length > 1 ? 2 : 1}
                        contentContainerStyle={styles.flatListContent}
                    />
                ) : (
                    <LinearGradient colors={['#0F172A', '#020617', '#0F172A']} style={styles.remoteVideo}>
                        <View style={styles.bgCenter}>
                            <MotiView
                                from={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 1.2, opacity: 1 }}
                                transition={{
                                    type: 'timing',
                                    duration: 1000,
                                    loop: true,
                                    repeatReverse: true
                                }}
                            >
                                <Image source={{ uri: photoUri }} style={styles.calleeAvatarLg} />
                            </MotiView>
                            <Text style={styles.waitingText}>Waiting for others to join...</Text>
                        </View>
                    </LinearGradient>
                )}
            </View>

            {/* Header Overlay */}
            <SafeAreaView style={styles.headerOverlay}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => leave()}>
                        <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={styles.calleeName}>{calleeName}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.onlineDot, { backgroundColor: status === 'active' ? '#10B981' : '#FBBF24' }]} />
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
            </SafeAreaView>

            {/* Controls */}
            <MeetingControls />
        </View>
    );
}

export default function CallScreen() {
    const params = useLocalSearchParams<{
        targetId: string;
        sessionId?: string;
        roomId?: string;
        isIncoming?: string;
        callType?: string;
        calleeName?: string;
        calleePhoto?: string;
    }>();
    
    console.log(`[Calling] Params: ${JSON.stringify(params)}`);

    const isIncoming = params.isIncoming === 'true';
    const [meetingId, setMeetingId] = useState<string | null>(isIncoming && params.roomId ? params.roomId : null);
    const [meetingToken] = useState(VIDEOSDK_TOKEN);
    const [status, setStatus] = useState<string>('connecting');
    const [elapsed, setElapsed] = useState(0);
    const [coinRate, setCoinRate] = useState(0);

    useEffect(() => {
        async function setupCall() {
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
                        Alert.alert('Permissions Required', 'Camera and mic permissions are required for the call.');
                        router.back();
                        return;
                    }
                } catch (err) {
                    console.warn(err);
                }
            }

            if (!isIncoming) {
                try {
                    const type = (params.callType || 'VOICE').toUpperCase() as 'VOICE' | 'VIDEO';
                    
                    // 1. Generate VideoSDK Room ID first!
                    let generatedRoomId = '';
                    try {
                         generatedRoomId = await videoSdkApi.createMeeting(meetingToken);
                    } catch (err: any) {
                         Alert.alert('VideoSDK Error', 'Invalid VideoSDK token or network error. Please configure VIDEOSDK_TOKEN.');
                         router.back();
                         return;
                    }

                    // 2. Register call with backend using this Room ID
                    const session = await callsApi.initiate(Number(params.targetId), type, generatedRoomId);
                    
                    setMeetingId(generatedRoomId);
                    setCoinRate(session.coins_per_min || 0);
                } catch (error: any) {
                    Alert.alert('Call Failed', error?.response?.data?.detail || 'Could not start call');
                    router.back();
                }
            }
        }
        setupCall();
    }, [isIncoming, params.targetId, params.callType]);

    useEffect(() => {
        let timer: any;
        if (status === 'active') {
            timer = setInterval(() => setElapsed(e => e + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [status]);

    if (!meetingId) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>Initiating Call...</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 30, padding: 10 }}>
                    <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <MeetingProvider
            config={{
                meetingId,
                name: 'User', // Could be dynamic from auth state if needed
                micEnabled: true,
                webcamEnabled: params.callType === 'video' || params.callType === 'VIDEO',
            }}
            token={meetingToken}
        >
            <MeetingView
                calleeName={params.calleeName || 'User'}
                photoUri={params.calleePhoto || 'https://via.placeholder.com/150'}
                status={status}
                setStatus={setStatus}
                elapsed={elapsed}
                coinRate={coinRate}
            />
        </MeetingProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000'
    },
    meetingGrid: {
        flex: 1,
    },
    flatListContent: {
        flexGrow: 1,
        padding: 8,
    },
    remoteVideo: {
        flex: 1,
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
    waitingText: {
        color: '#9CA3AF',
        marginTop: 20,
        fontSize: 14,
        fontWeight: '500'
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
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
});


