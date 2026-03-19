import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

type GameState = 'Lobby' | 'Waiting' | 'TurnAssigned' | 'ActionPending' | 'VotingState' | 'ResultState';
type WSMessage = {
    action?: string;
    type?: string;
    event?: string;
    players?: any[];
    state?: GameState;
    player_id?: number;
    task?: string;
    task_type?: string;
    payload?: any;
    passed?: boolean;
};

export default function GameRoomScreen() {
    const { roomId } = useLocalSearchParams();
    const { user } = useAuthStore();
    const wsRef = useRef<WebSocket | null>(null);

    const [gameState, setGameState] = useState<GameState>('Lobby');
    const [players, setPlayers] = useState<any[]>([]);
    const [activeTurnPlayerId, setActiveTurnPlayerId] = useState<number | null>(null);
    const [currentTask, setCurrentTask] = useState<{ text: string, type: string } | null>(null);
    const [actionPayload, setActionPayload] = useState<any>(null);
    const [lastResult, setLastResult] = useState<string>('');

    useEffect(() => {
        if (!roomId) return;
        // In a real app, use the env WS_URL
        const wsUrl = `ws://localhost:8000/ws/game/${roomId}/`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Game Engine');
        };

        ws.onmessage = (e) => {
            const data: WSMessage = JSON.parse(e.data);
            if (data.event === 'PlayerJoined') {
                setPlayers(data.players || []);
                setGameState('Waiting');
            } else if (data.event === 'GameStarted') {
                setGameState('TurnAssigned');
            } else if (data.event === 'TurnAssigned') {
                setActiveTurnPlayerId(data.player_id || null);
                setCurrentTask({ text: data.task || '', type: data.task_type || '' });
                setGameState('ActionPending');
            } else if (data.event === 'VoteRequested') {
                setActionPayload(data.payload);
                setGameState('VotingState');
            } else if (data.event === 'RoundEnded') {
                setLastResult(data.passed ? "Action Passed! Relationship +10 ❤️" : "Action Failed! No Points 💔");
                setGameState('ResultState');
                
                // Auto-progress to next turn visually
                setTimeout(() => setGameState('TurnAssigned'), 3000);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Game Engine');
        };

        return () => {
            ws.close();
        };
    }, [roomId]);

    const startGame = () => {
        wsRef.current?.send(JSON.stringify({ action: 'start_game' }));
    };

    const submitAction = () => {
        // User indicates they have completed the Truth or Dare
        wsRef.current?.send(JSON.stringify({ action: 'submit_action', payload: { completed: true } }));
    };

    const castVote = (vote: 'pass' | 'fail') => {
        wsRef.current?.send(JSON.stringify({ action: 'cast_vote', vote }));
        setGameState('ResultState'); // Optimistic local UI transition
    };

    const isActivePlayer = activeTurnPlayerId === user?.id;

    const renderState = () => {
        switch (gameState) {
            case 'Lobby':
            case 'Waiting':
                return (
                    <View style={styles.centerContainer}>
                        <MaterialCommunityIcons name="gamepad-variant" size={80} color="#8B5CF6" />
                        <Text style={styles.title}>Truth or Dare Engine</Text>
                        <Text style={styles.subtitle}>Waiting for players... ({players.length} connected)</Text>
                        {players.map((p, i) => <Text key={i} style={styles.playerText}>👤 {p.username}</Text>)}
                        
                        <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
                            <Text style={styles.buttonText}>START GAME</Text>
                        </TouchableOpacity>
                    </View>
                );
                
            case 'ActionPending':
            case 'TurnAssigned':
                return (
                    <View style={styles.centerContainer}>
                        <Text style={styles.stateHeader}>
                            {isActivePlayer ? "🟢 YOUR TURN!" : "🔴 WAITING FOR PLAYER"}
                        </Text>
                        
                        {currentTask && (
                            <View style={styles.taskCard}>
                                <Text style={styles.taskType}>{currentTask.type.toUpperCase()}</Text>
                                <Text style={styles.taskText}>{currentTask.text}</Text>
                            </View>
                        )}

                        {isActivePlayer ? (
                            <TouchableOpacity style={styles.primaryButton} onPress={submitAction}>
                                <Text style={styles.buttonText}>I DID IT</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.spectatorText}>Spectating active player...</Text>
                        )}
                    </View>
                );

            case 'VotingState':
                return (
                    <View style={styles.centerContainer}>
                        <Text style={styles.stateHeader}>VOTE REQUIRED</Text>
                        <Text style={styles.subtitle}>Did they actually do the {currentTask?.type}?</Text>
                        
                        {!isActivePlayer ? (
                            <View style={styles.voteRow}>
                                <TouchableOpacity style={[styles.primaryButton, {backgroundColor: '#22C55E'}]} onPress={() => castVote('pass')}>
                                    <Text style={styles.buttonText}>👍 PASS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.primaryButton, {backgroundColor: '#EF4444'}]} onPress={() => castVote('fail')}>
                                    <Text style={styles.buttonText}>👎 FAIL</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.spectatorText}>Waiting for peers to vote on your action...</Text>
                        )}
                    </View>
                );

            case 'ResultState':
                return (
                    <View style={styles.centerContainer}>
                        <Text style={styles.title}>ROUND OVER</Text>
                        <Text style={styles.resultText}>{lastResult || 'Waiting on final server tally...'}</Text>
                    </View>
                );
        }
    };

    return (
        <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.container}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Room: {roomId}</Text>
                    <MaterialCommunityIcons name="dots-vertical" size={28} color="#FFF" />
                </View>
                
                <ScrollView contentContainerStyle={styles.scroll}>
                    {renderState()}
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
    headerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    scroll: { flexGrow: 1, justifyContent: 'center' },
    centerContainer: { alignItems: 'center', padding: 20 },
    title: { fontSize: 32, fontWeight: '900', color: '#FFF', marginVertical: 20 },
    subtitle: { fontSize: 16, color: '#A5B4FC', marginBottom: 20 },
    playerText: { fontSize: 18, color: '#FFF', marginVertical: 4 },
    primaryButton: { backgroundColor: '#8B5CF6', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30, marginTop: 40, width: '80%', alignItems: 'center' },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
    stateHeader: { fontSize: 24, fontWeight: 'bold', color: '#FCD34D', marginBottom: 30 },
    taskCard: { backgroundColor: '#FFF', width: '90%', padding: 40, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
    taskType: { color: '#8B5CF6', fontWeight: '900', fontSize: 16, letterSpacing: 2, marginBottom: 15 },
    taskText: { color: '#1E293B', fontSize: 22, fontWeight: 'bold', textAlign: 'center', lineHeight: 32 },
    spectatorText: { color: '#94A3B8', fontSize: 16, marginTop: 30, fontStyle: 'italic' },
    voteRow: { flexDirection: 'row', gap: 20, marginTop: 20 },
    resultText: { fontSize: 20, color: '#FFF', fontWeight: 'bold', marginTop: 10, textAlign: 'center' }
});
