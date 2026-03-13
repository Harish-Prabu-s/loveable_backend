import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    StatusBar, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { betMatchApi, monetizationApi } from '@/api/vibely';
import { useAuthStore } from '@/store/authStore';
import { getProfileAvatar } from '@/utils/avatar';

type BetMatch = {
    id: number; status: string; male_user: number; female_user?: number;
    male_user_name?: string; female_user_name?: string;
    male_user_photo?: string; female_user_photo?: string;
    coins_staked: number; result_coins: number; result_money: string;
    winner_gender?: string;
};

type Phase = 'info' | 'waiting' | 'active' | 'result';

export default function BetMatchScreen() {
    const { user } = useAuthStore();
    const gender = (user as any)?.gender as string;

    const [phase, setPhase] = useState<Phase>('info');
    const [match, setMatch] = useState<BetMatch | null>(null);
    const [loading, setLoading] = useState(false);
    const [rewards, setRewards] = useState({ coins: 100, money: '50.00' });
    const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        monetizationApi.getPricing('bet_match').catch(() => { });
        betMatchApi.list('pending').then((data: any[]) => { }).catch(() => { });
    }, []);

    useEffect(() => () => { if (pollTimer) clearInterval(pollTimer); }, [pollTimer]);

    const startMatch = async () => {
        if (!gender || (gender !== 'M' && gender !== 'F')) {
            Alert.alert('Gender Required', 'Please set your gender (Male/Female) in profile settings first.');
            return;
        }
        setLoading(true);
        try {
            const m = await betMatchApi.create();
            setMatch(m);
            if (m.status === 'active') {
                setPhase('active');
            } else {
                setPhase('waiting');
                // Poll for match becoming active
                const timer = setInterval(async () => {
                    try {
                        const list = await betMatchApi.list('active');
                        const found = list.find((x: BetMatch) => x.id === m.id);
                        if (found) {
                            setMatch(found);
                            setPhase('active');
                            clearInterval(timer);
                        }
                    } catch { /* ignore */ }
                }, 3000);
                setPollTimer(timer);
            }
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Could not create match.');
        } finally {
            setLoading(false);
        }
    };

    const declareWinner = async (winnerGender: 'M' | 'F') => {
        if (!match) return;
        try {
            const result = await betMatchApi.result(match.id, winnerGender);
            setMatch(result);
            setPhase('result');
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Could not submit result.');
        }
    };

    const cancelMatch = () => {
        if (pollTimer) clearInterval(pollTimer);
        setPhase('info');
        setMatch(null);
    };

    // ── INFO PHASE ──
    if (phase === 'info') {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar barStyle="light-content" />
                <ScrollView contentContainerStyle={styles.centered}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color="#94A3B8" />
                    </TouchableOpacity>

                    <LinearGradient colors={['#7C3AED', '#EC4899']} style={styles.heroBadge}>
                        <Text style={styles.heroEmoji}>⚔️</Text>
                    </LinearGradient>

                    <Text style={styles.title}>Bet Match</Text>
                    <Text style={styles.subtitle}>Compete against the opposite gender!</Text>

                    <View style={styles.rulesCard}>
                        <Text style={styles.rulesTitle}>How it Works</Text>
                        {[
                            '🚫 Same gender matches are blocked',
                            '👨 Male requests → waits for Female opponent',
                            '👩 Female joins → match becomes active',
                            '🎮 Play a game, declare the winner',
                            '🏆 Male winner → gets Coins',
                            '💰 Female winner → gets Real Money',
                        ].map((rule, i) => (
                            <Text key={i} style={styles.ruleText}>{rule}</Text>
                        ))}
                    </View>

                    <View style={styles.rewardsBanner}>
                        <View style={styles.rewardSide}>
                            <MaterialCommunityIcons name="database" size={28} color="#FBBF24" />
                            <Text style={styles.rewardValue}>+{rewards.coins}</Text>
                            <Text style={styles.rewardLabel}>Coins for Male</Text>
                        </View>
                        <View style={styles.rewardDivider} />
                        <View style={styles.rewardSide}>
                            <MaterialCommunityIcons name="currency-inr" size={28} color="#10B981" />
                            <Text style={[styles.rewardValue, { color: '#10B981' }]}>₹{rewards.money}</Text>
                            <Text style={styles.rewardLabel}>Money for Female</Text>
                        </View>
                    </View>

                    {gender && gender !== 'M' && gender !== 'F' && (
                        <View style={styles.warningBanner}>
                            <MaterialCommunityIcons name="alert" size={18} color="#F59E0B" />
                            <Text style={styles.warningText}>Set your gender in Profile to join</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.startBtn} onPress={startMatch} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color="#FFF" />
                            : <Text style={styles.startBtnText}>Find Match</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── WAITING PHASE ──
    if (phase === 'waiting') {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.waitTitle}>Waiting for opponent…</Text>
                    <Text style={styles.waitSub}>Match #{match?.id} created. Searching for a {gender === 'M' ? 'Female' : 'Male'} opponent.</Text>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelMatch}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── ACTIVE PHASE ──
    if (phase === 'active' && match) {
        return (
            <SafeAreaView style={styles.safe}>
                <ScrollView contentContainerStyle={styles.centered}>
                    <Text style={styles.title}>Match Active!</Text>
                    <Text style={styles.subtitle}>Match #{match.id}</Text>

                    <View style={styles.vsRow}>
                        <View style={styles.playerCard}>
                            <Image
                                source={{ uri: getProfileAvatar(match.male_user_photo, match.male_user, 'M') }}
                                style={styles.playerAvatar}
                            />
                            <Text style={styles.playerName}>{match.male_user_name || 'Male Player'}</Text>
                            <Text style={styles.playerGender}>♂️ Male</Text>
                            <Text style={styles.playerReward}>🏆 +{match.result_coins || 100} Coins</Text>
                        </View>

                        <Text style={styles.vsText}>VS</Text>

                        <View style={styles.playerCard}>
                            <Image
                                source={{ uri: getProfileAvatar(match.female_user_photo, match.female_user, 'F') }}
                                style={styles.playerAvatar}
                            />
                            <Text style={styles.playerName}>{match.female_user_name || 'Female Player'}</Text>
                            <Text style={styles.playerGender}>♀️ Female</Text>
                            <Text style={[styles.playerReward, { color: '#10B981' }]}>💰 ₹{match.result_money || '50.00'}</Text>
                        </View>
                    </View>

                    <Text style={styles.declareTitle}>Declare Winner</Text>
                    <View style={styles.declareRow}>
                        <TouchableOpacity style={[styles.declareBtn, { backgroundColor: '#3B82F6' }]} onPress={() => declareWinner('M')}>
                            <Text style={styles.declareBtnText}>♂️ Male Won</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.declareBtn, { backgroundColor: '#EC4899' }]} onPress={() => declareWinner('F')}>
                            <Text style={styles.declareBtnText}>♀️ Female Won</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── RESULT PHASE ──
    if (phase === 'result' && match) {
        const malWon = match.winner_gender === 'M';
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centered}>
                    <LinearGradient colors={malWon ? ['#3B82F6', '#1E3A8A'] : ['#EC4899', '#9D174D']} style={styles.resultBadge}>
                        <Text style={styles.resultEmoji}>{malWon ? '🏆' : '💰'}</Text>
                    </LinearGradient>
                    <Text style={styles.title}>{malWon ? 'Male Wins!' : 'Female Wins!'}</Text>
                    {malWon
                        ? <Text style={styles.resultReward}>+{match.result_coins} Coins awarded to {match.male_user_name}</Text>
                        : <Text style={styles.resultReward}>₹{match.result_money} awarded to {match.female_user_name}</Text>
                    }
                    <TouchableOpacity style={styles.startBtn} onPress={() => { setPhase('info'); setMatch(null); }}>
                        <Text style={styles.startBtnText}>Play Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                        <Text style={styles.cancelBtnText}>Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#020617' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 60 },
    backBtn: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    heroBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    heroEmoji: { fontSize: 36 },
    title: { fontSize: 28, fontWeight: '800', color: '#F1F5F9', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24 },
    rulesCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B', gap: 8 },
    rulesTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
    ruleText: { fontSize: 13, color: '#94A3B8', lineHeight: 20 },
    rewardsBanner: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#1E293B' },
    rewardSide: { flex: 1, alignItems: 'center', gap: 4 },
    rewardDivider: { width: 1, backgroundColor: '#1E293B', marginVertical: 4 },
    rewardValue: { fontSize: 20, fontWeight: '800', color: '#FBBF24' },
    rewardLabel: { fontSize: 11, color: '#64748B', textAlign: 'center' },
    warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', padding: 12, borderRadius: 10, marginBottom: 16, width: '100%' },
    warningText: { color: '#F59E0B', fontSize: 13 },
    startBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, marginTop: 8 },
    startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    cancelBtn: { marginTop: 14 },
    cancelBtnText: { color: '#64748B', fontSize: 14 },
    waitTitle: { fontSize: 20, fontWeight: '700', color: '#F1F5F9', marginTop: 20 },
    waitSub: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 24 },
    vsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 20 },
    playerCard: { flex: 1, alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
    playerAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
    playerName: { fontSize: 13, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
    playerGender: { fontSize: 12, color: '#64748B', marginTop: 2 },
    playerReward: { fontSize: 12, fontWeight: '700', color: '#FBBF24', marginTop: 4 },
    vsText: { fontSize: 22, fontWeight: '900', color: '#EF4444' },
    declareTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', marginBottom: 14 },
    declareRow: { flexDirection: 'row', gap: 14 },
    declareBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    declareBtnText: { color: '#FFF', fontWeight: '700' },
    resultBadge: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    resultEmoji: { fontSize: 46 },
    resultReward: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginBottom: 24, marginTop: 8 },
});
