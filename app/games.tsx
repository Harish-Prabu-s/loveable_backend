import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Alert, Dimensions, Modal
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import TicTacToe from '@/components/games/TicTacToe';
import LudoBoard from '@/components/games/LudoBoard';
import CarromBoard from '@/components/games/CarromBoard';
import FruitSlash from '@/components/games/FruitSlash';
import CandyMatch from '@/components/games/CandyMatch';

interface Game {
    id: string;
    title: string;
    description: string;
    players: string;
    rating: number;
    imageColor: string;
    isPopular?: boolean;
    imageUrl?: string;
}

const GAMES: Game[] = [
    {
        id: 'tictactoe',
        title: 'Tic Tac Toe',
        description: 'Classic X and O game',
        players: '15k+ Playing',
        rating: 4.8,
        imageColor: '#3B82F6', // bg-blue-500
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1668901382969-8c73e450a1f5?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: 'ludo',
        title: 'Ludo Classic',
        description: 'Play the classic board game with friends',
        players: '10k+ Playing',
        rating: 4.8,
        imageColor: '#EF4444', // bg-red-500
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1610890716254-d751959dc6c7?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: 'carrom',
        title: 'Carrom Pro',
        description: 'Strike and pocket the coins',
        players: '5k+ Playing',
        rating: 4.6,
        imageColor: '#EAB308', // bg-yellow-500
        imageUrl: 'https://images.unsplash.com/photo-1634907861962-675e01c40217?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: 'fruit',
        title: 'Fruit Slash',
        description: 'Slice fruits, avoid bombs!',
        players: '8k+ Playing',
        rating: 4.7,
        imageColor: '#22C55E', // bg-green-500
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1615485925763-867862f80a90?w=500&auto=format&fit=crop&q=60'
    },
    {
        id: 'candy',
        title: 'Sweet Match',
        description: 'Match 3 candies to win',
        players: '12k+ Playing',
        rating: 4.9,
        imageColor: '#EC4899', // bg-pink-500
        imageUrl: 'https://images.unsplash.com/photo-1582053433976-25c00369fc93?w=500&auto=format&fit=crop&q=60'
    }
];

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function GamesScreen() {
    const { user } = useAuthStore();
    // Mock wallet for now until integration is verified
    const wallet = { coin_balance: 100 };

    const [activeGame, setActiveGame] = useState<Game | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isBetMode, setIsBetMode] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const secondsRef = useRef(0);

    useEffect(() => {
        if (activeGame) {
            secondsRef.current = 0;
            timerRef.current = setInterval(() => {
                secondsRef.current += 1;
                if (secondsRef.current % 180 === 0 && !isBetMode) {
                    Alert.alert('Reward', "You earned 1 coin for playing!");
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeGame, isBetMode]);

    const handlePlayGame = async (game: Game) => {
        if (isBetMode) {
            const isFemale = user?.gender === 'F';

            if (!isFemale) {
                Alert.alert(
                    "Bet Match",
                    "Start Bet Match? Entry fee: 10 coins.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Start",
                            onPress: () => {
                                if ((wallet?.coin_balance || 0) < 10) {
                                    Alert.alert("Error", "Insufficient coins! Please recharge.");
                                    return;
                                }
                                startMatchmaking(game);
                            }
                        }
                    ]
                );
            } else {
                startMatchmaking(game);
            }
        } else {
            setActiveGame(game);
        }
    };

    const startMatchmaking = (game: Game) => {
        setIsSearching(true);
        setTimeout(() => {
            setIsSearching(false);
            setActiveGame(game);
            Alert.alert("Success", "Opponent Found! Game Starting...");
        }, 2000);
    };

    const handleGameOver = (winner: 'me' | 'opponent' | 'draw') => {
        if (isBetMode) {
            if (winner === 'me') {
                Alert.alert("Victory!", "You Won! +30 Coins added to wallet.");
            } else if (winner === 'opponent') {
                Alert.alert("Defeat", "You Lost. Better luck next time!");
            } else {
                Alert.alert("Draw", "It's a draw! Money returned.");
            }
        } else {
            if (winner === 'me') Alert.alert("Result", "You Won!");
            else if (winner === 'opponent') Alert.alert("Result", "You Lost!");
            else Alert.alert("Result", "Draw!");
        }
        setActiveGame(null);
    };

    if (activeGame) {
        const gameOver = (winner: 'me' | 'opponent') => handleGameOver(winner);
        return (
            <SafeAreaView style={styles.gameContainer}>
                <View style={styles.gameHeader}>
                    <TouchableOpacity onPress={() => setActiveGame(null)} style={styles.gameBackButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.gameTitle}>{activeGame.title}</Text>
                    {isBetMode && (
                        <View style={styles.betBadge}>
                            <Text style={styles.betBadgeText}>💰 Bet</Text>
                        </View>
                    )}
                    {!isBetMode && <View style={{ width: 60 }} />}
                </View>
                <View style={styles.gameContent}>
                    {activeGame.id === 'tictactoe' && (
                        <TicTacToe onGameOver={gameOver} />
                    )}
                    {activeGame.id === 'ludo' && (
                        <LudoBoard onGameOver={gameOver} />
                    )}
                    {activeGame.id === 'carrom' && (
                        <CarromBoard onGameOver={gameOver} />
                    )}
                    {activeGame.id === 'fruit' && (
                        <FruitSlash onGameOver={gameOver} />
                    )}
                    {activeGame.id === 'candy' && (
                        <CandyMatch onGameOver={gameOver} />
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.walletBadge}>
                            <Text style={styles.walletIcon}>🪙</Text>
                            <Text style={styles.walletText}>{wallet?.coin_balance || 0}</Text>
                        </View>
                    </View>

                    <Text style={styles.pageTitle}>Game Zone</Text>
                    <Text style={styles.pageSubtitle}>Play, Compete, and Earn Coins!</Text>

                    {/* Mode Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, !isBetMode && styles.toggleButtonActive]}
                            onPress={() => setIsBetMode(false)}
                        >
                            <Text style={[styles.toggleText, !isBetMode && styles.toggleTextActive]}>
                                Fun Play
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, isBetMode && styles.toggleButtonBetActive]}
                            onPress={() => setIsBetMode(true)}
                        >
                            <Text style={[styles.toggleText, isBetMode && styles.toggleTextActive]}>
                                Bet Match 💰
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isBetMode && (
                        <View style={styles.betRulesBox}>
                            <Text style={styles.betRulesTitle}>🔥 Bet Match Rules:</Text>
                            <Text style={styles.betRuleItem}>• Entry Fee: 10 Coins (Free for Women)</Text>
                            <Text style={styles.betRuleItem}>• Opponent: Opposite Gender Only</Text>
                            <Text style={styles.betRuleItem}>• Winner Reward: 30 Coins! 🏆</Text>
                        </View>
                    )}

                    <View style={styles.tournamentBox}>
                        <View>
                            <Text style={styles.tournamentTitle}>Daily Tournament</Text>
                            <Text style={styles.tournamentSubtitle}>Win up to 5000 coins!</Text>
                        </View>
                        <MaterialCommunityIcons name="trophy" size={40} color="#FDE047" />
                    </View>
                </View>

                {/* Games Grid */}
                <View style={styles.bodySection}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="trophy" size={20} color="#EAB308" />
                        <Text style={styles.sectionTitle}>Popular Games</Text>
                    </View>

                    <View style={styles.gridContainer}>
                        {GAMES.map((game) => (
                            <TouchableOpacity
                                key={game.id}
                                style={styles.gameCard}
                                onPress={() => handlePlayGame(game)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.gameImageContainer, { backgroundColor: game.imageColor }]}>
                                    {game.imageUrl ? (
                                        <Image
                                            source={{ uri: game.imageUrl }}
                                            style={styles.gameImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <MaterialCommunityIcons name="gamepad-variant" size={40} color="rgba(255,255,255,0.8)" />
                                    )}
                                    <View style={styles.gameIconOverlay}>
                                        <MaterialCommunityIcons name="gamepad-variant" size={32} color="#FFFFFF" />
                                    </View>
                                </View>
                                <View style={styles.gameInfo}>
                                    <Text style={styles.gameName}>{game.title}</Text>
                                    <View style={styles.statsRow}>
                                        <MaterialCommunityIcons name="account-group" size={12} color="#64748B" />
                                        <Text style={styles.statsText}>{game.players}</Text>
                                    </View>
                                    <View style={styles.statsRow}>
                                        <MaterialCommunityIcons name="star" size={12} color="#EAB308" />
                                        <Text style={[styles.statsText, { color: '#B45309', fontWeight: '500' }]}>{game.rating}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Matchmaking Modal */}
            <Modal visible={isSearching} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <ActivityIndicator size="large" color="#8B5CF6" style={{ marginBottom: 24 }} />
                    <Text style={styles.modalTitle}>Finding Opponent...</Text>
                    <Text style={styles.modalSubtitle}>Matching with {user?.gender === 'F' ? 'Male' : 'Female'} player...</Text>
                    <Text style={styles.modalSmallText}>Connecting to opposite gender only...</Text>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerSection: {
        padding: 24,
        paddingBottom: 40,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    walletIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    walletText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 24,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        padding: 4,
        borderRadius: 12,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#8B5CF6',
    },
    toggleButtonBetActive: {
        backgroundColor: '#EF4444',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    betRulesBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    betRulesTitle: {
        fontWeight: '700',
        color: '#FECACA',
        marginBottom: 4,
    },
    betRuleItem: {
        color: 'rgba(254, 202, 202, 0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    tournamentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#7C3AED',
        padding: 16,
        borderRadius: 16,
    },
    tournamentTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    tournamentSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    bodySection: {
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        minHeight: 500,
        marginTop: -24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gameCard: {
        width: ITEM_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    gameImageContainer: {
        height: ITEM_WIDTH * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    gameImage: {
        width: '100%',
        height: '100%',
    },
    gameIconOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameInfo: {
        padding: 12,
    },
    gameName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statsText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
    },
    modalSmallText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 8,
    },
    gameContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    gameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#1E293B',
    },
    gameBackButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    gameTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    gameContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    placeholderText: {
        color: '#94A3B8',
        marginTop: 16,
        fontSize: 16,
    },
    betModeWarning: {
        color: '#FDE047',
        marginTop: 16,
        fontWeight: '700',
    },
    simButton: {
        marginTop: 32,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    simButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    betBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    betBadgeText: {
        color: '#FCA5A5',
        fontWeight: '700',
        fontSize: 13,
    }
});
