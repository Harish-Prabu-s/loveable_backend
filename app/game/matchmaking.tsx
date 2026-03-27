import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import apiClient from '@/api/client';

export default function MatchmakingScreen() {
    const { coupleTarget, coupleName } = useLocalSearchParams();
    const { user } = useAuthStore();
    const [mode, setMode] = useState<'couple' | 'random'>('random');
    const [status, setStatus] = useState<'idle' | 'searching' | 'found'>('idle');
    const [foundRoomId, setFoundRoomId] = useState<number | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

    // Initial effect to launch Couple Mode instantly if routed from chat
    useEffect(() => {
        if (coupleTarget) {
            setMode('couple');
            startCoupleMatch(Number(coupleTarget));
        }
    }, [coupleTarget]);

    const startCoupleMatch = async (targetId: number) => {
        setStatus('searching');
        try {
            // Call REST API to spin up game directly instead of redis queues
            const response = await apiClient.post('games/create/', {
                room_type: 'couple',
                target_user_id: targetId
            });
            const roomData = response.data;
            setFoundRoomId(roomData.id);
            setStatus('found');
            
            // Advance automatically to the board
            setTimeout(() => {
                router.replace(`/game/${roomData.id}`);
            }, 1000);
        } catch (e) {
            console.error("Couple match failed", e);
            Alert.alert("Error", "Could not create couple game session.");
            setStatus('idle');
        }
    };

    const startRandomMatch = (playerMode: '2p' | '4p') => {
        setStatus('searching');
        const wsUrl = `ws://localhost:8000/ws/matchmaking/`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to Matchmaker");
            ws.send(JSON.stringify({
                action: 'search_match',
                mode: playerMode
            }));
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.event === 'MatchFound') {
                setFoundRoomId(data.room_id);
                setStatus('found');
                setTimeout(() => {
                    router.replace(`/game/${data.room_id}`);
                }, 1500);
            } else if (data.event === 'Error') {
                Alert.alert("Matchmaking Error", data.message);
                cancelSearch();
            }
        };

        ws.onclose = () => console.log("Matchmaker connection closed");
    };

    const cancelSearch = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ action: 'cancel_search' }));
            wsRef.current.close();
        }
        setStatus('idle');
    };

    return (
        <LinearGradient colors={['#0F172A', '#1E1B4B', '#0F172A']} style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Game Lobby</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.content}>
                    {status === 'idle' ? (
                        <>
                            <MaterialCommunityIcons name="radar" size={80} color="#8B5CF6" style={{ marginBottom: 40 }} />
                            <Text style={styles.title}>Find a Game</Text>
                            <Text style={styles.subtitle}>Discover new people or play natively with friends.</Text>

                            <TouchableOpacity style={styles.primaryButton} onPress={() => startRandomMatch('2p')}>
                                <MaterialCommunityIcons name="account-search" size={24} color="#FFF" style={{ marginRight: 10 }} />
                                <Text style={styles.buttonText}>Random 1v1 (Safe)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#3B82F6' }]} onPress={() => startRandomMatch('4p')}>
                                <MaterialCommunityIcons name="account-group" size={24} color="#FFF" style={{ marginRight: 10 }} />
                                <Text style={styles.buttonText}>Group 4p (Party)</Text>
                            </TouchableOpacity>
                        </>
                                        ) : status === 'searching' ? (
                        <View style={styles.radarContainer}>
                            {[0, 1, 2].map((i) => (
                                <MotiView
                                    key={i}
                                    from={{ scale: 1, opacity: 0.6 }}
                                    animate={{ scale: 3.5, opacity: 0 }}
                                    transition={{
                                        type: 'timing',
                                        duration: 2500,
                                        loop: true,
                                        delay: i * 800,
                                    }}
                                    style={styles.radarCircle}
                                />
                            ))}
                            <MotiView
                                animate={{
                                    scale: [1, 1.1, 1],
                                }}
                                transition={{
                                    type: 'timing',
                                    duration: 1000,
                                    loop: true,
                                }}
                            >
                                <MaterialCommunityIcons name="radar" size={90} color="#FCD34D" />
                            </MotiView>
                            <Text style={styles.searchingText}>
                                {mode === 'couple' ? `Connecting with ${coupleName}...` : 'Scanning for opposites...'}
                            </Text>

                            <TouchableOpacity style={styles.cancelButton} onPress={cancelSearch}>
                                <Text style={styles.cancelText}>CANCEL</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <MotiView 
                            from={{ translateY: 50, opacity: 0 }}
                            animate={{ translateY: 0, opacity: 1 }}
                            style={styles.radarContainer}
                        >
                            <MaterialCommunityIcons name="check-circle" size={100} color="#22C55E" />
                            <Text style={styles.matchedText}>MATCH FOUND!</Text>
                            <Text style={styles.subtitle}>Routing you into the game board...</Text>
                        </MotiView>
                    )}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    headerText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    title: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#94A3B8', marginBottom: 40, textAlign: 'center', lineHeight: 24 },
    primaryButton: { 
        backgroundColor: '#8B5CF6', 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 18, 
        paddingHorizontal: 30, 
        borderRadius: 30, 
        width: '100%', 
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#8B5CF6',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8
    },
    buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
    radarContainer: { alignItems: 'center', justifyContent: 'center' },
    radarCircle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#8B5CF6', borderWidth: 2, borderColor: '#C4B5FD' },
    searchingText: { color: '#FCD34D', fontSize: 20, fontWeight: 'bold', marginTop: 40, letterSpacing: 1 },
    matchedText: { color: '#22C55E', fontSize: 32, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
    cancelButton: { marginTop: 50, borderWidth: 1, borderColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
    cancelText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 }
});
