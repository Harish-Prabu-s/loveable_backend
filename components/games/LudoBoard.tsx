import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LudoBoard({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
    const [playerPos, setPlayerPos] = useState(0);
    const [botPos, setBotPos] = useState(0);
    const [turn, setTurn] = useState<'me' | 'opponent'>('me');
    const [diceValue, setDiceValue] = useState(1);
    const [rolling, setRolling] = useState(false);
    const [message, setMessage] = useState("Your Turn! Tap Dice.");

    const playerAnim = useRef(new Animated.Value(0)).current;
    const botAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    const WIN_POS = 50;
    const boardWidth = 300;
    const travelDist = boardWidth * 0.9;

    const rollDice = () => Math.floor(Math.random() * 6) + 1;

    useEffect(() => {
        Animated.spring(playerAnim, {
            toValue: (playerPos / WIN_POS) * travelDist,
            useNativeDriver: true,
            bounciness: 12,
        }).start();
    }, [playerPos, playerAnim, travelDist]);

    useEffect(() => {
        Animated.spring(botAnim, {
            toValue: (botPos / WIN_POS) * travelDist,
            useNativeDriver: true,
            bounciness: 12,
        }).start();
    }, [botPos, botAnim, travelDist]);

    const animateDice = async () => {
        spinAnim.setValue(0);
        const spinLoop = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            })
        );
        spinLoop.start();

        let val = 1;
        for (let i = 0; i < 10; i++) {
            val = rollDice();
            setDiceValue(val);
            await new Promise(r => setTimeout(r, 100));
        }
        spinLoop.stop();
        return val;
    };

    const handleRoll = async () => {
        if (turn !== 'me' || rolling) return;

        setRolling(true);
        setMessage("Rolling...");

        const val = await animateDice();
        setRolling(false);

        const newPos = playerPos + val;
        if (newPos <= WIN_POS) {
            setPlayerPos(newPos);
            if (newPos === WIN_POS) {
                setMessage("You Reached Home! 🏆");
                setTimeout(() => onGameOver('me'), 1000);
                return;
            }
        } else {
            setMessage("Need exact roll!");
        }

        setTurn('opponent');
    };

    useEffect(() => {
        if (turn === 'opponent') {
            setMessage("Opponent's Turn...");
            const timer = setTimeout(async () => {
                setRolling(true);
                const val = await animateDice();
                setRolling(false);

                const newPos = botPos + val;
                if (newPos <= WIN_POS) {
                    setBotPos(newPos);
                    if (newPos === WIN_POS) {
                        setMessage("Opponent Won! 😢");
                        setTimeout(() => onGameOver('opponent'), 1000);
                        return;
                    }
                }
                setTurn('me');
                setMessage("Your Turn!");
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [turn, botPos, onGameOver]);

    const diceIcons = ['dice-1', 'dice-1', 'dice-2', 'dice-3', 'dice-4', 'dice-5', 'dice-6'] as const;
    const currentIcon = diceIcons[diceValue] || 'dice-1';

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            <Text style={styles.messageText}>{message}</Text>

            {/* Board */}
            <View style={[styles.boardContainer, { width: boardWidth }]}>
                <View style={styles.track}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View key={i} style={styles.trackLine} />
                    ))}
                </View>

                <View style={styles.goal}>
                    <Text style={styles.goalText}>HOME</Text>
                </View>

                <Animated.View style={[styles.playerToken, { transform: [{ translateX: playerAnim }] }]}>
                    <Text style={styles.playerTokenLabel}>You</Text>
                </Animated.View>

                <Animated.View style={[styles.botToken, { transform: [{ translateX: botAnim }] }]}>
                    <Text style={styles.botTokenLabel}>Bot</Text>
                </Animated.View>
            </View>

            <View style={styles.controlsRow}>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>You</Text>
                    <Text style={styles.playerScore}>{playerPos}/{WIN_POS}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleRoll}
                    disabled={turn !== 'me' || rolling}
                    activeOpacity={0.7}
                    style={[
                        styles.diceBtn,
                        turn === 'me' && !rolling ? styles.diceBtnActive : styles.diceBtnInactive
                    ]}
                >
                    <Animated.View style={rolling ? { transform: [{ rotate: spin }] } : {}}>
                        <MaterialCommunityIcons
                            name={currentIcon}
                            size={48}
                            color={turn === 'me' && !rolling ? "#FFFFFF" : "#94A3B8"}
                        />
                    </Animated.View>
                </TouchableOpacity>

                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>Bot</Text>
                    <Text style={styles.botScore}>{botPos}/{WIN_POS}</Text>
                </View>
            </View>

            <Text style={styles.instruction}>Reach 50 steps to win!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        alignSelf: 'center',
    },
    messageText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
    },
    boardContainer: {
        height: 80,
        backgroundColor: '#E2E8F0',
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#CBD5E1',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'center',
    },
    track: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#DBEAFE',
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackLine: {
        flex: 1,
        height: '100%',
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    goal: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 60,
        backgroundColor: '#FACC15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalText: {
        fontWeight: '700',
        fontSize: 12,
        color: '#713F12',
    },
    playerToken: {
        position: 'absolute',
        top: 8,
        left: 10,
        width: 24,
        height: 24,
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        zIndex: 10,
    },
    playerTokenLabel: {
        position: 'absolute',
        top: -16,
        left: -4,
        fontSize: 10,
        fontWeight: '700',
        color: '#3B82F6',
    },
    botToken: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        width: 24,
        height: 24,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        zIndex: 10,
    },
    botTokenLabel: {
        position: 'absolute',
        bottom: -16,
        left: 0,
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    scoreBox: {
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    playerScore: {
        fontSize: 24,
        fontWeight: '700',
        color: '#3B82F6',
    },
    botScore: {
        fontSize: 24,
        fontWeight: '700',
        color: '#EF4444',
    },
    diceBtn: {
        width: 80,
        height: 80,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    diceBtnActive: {
        backgroundColor: '#3B82F6',
    },
    diceBtnInactive: {
        backgroundColor: '#F1F5F9',
    },
    instruction: {
        marginTop: 24,
        fontSize: 12,
        color: '#94A3B8',
    }
});
