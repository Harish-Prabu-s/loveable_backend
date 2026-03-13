import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { leagueApi } from '@/api/vibely';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';

type RankCategory = { key: string; label: string; icon: any; color: string };
const CATEGORIES: RankCategory[] = [
    { key: 'coins', label: 'Coins', icon: 'database', color: '#FBBF24' },
    { key: 'money', label: 'Money', icon: 'currency-inr', color: '#10B981' },
    { key: 'call_duration', label: 'Call Time', icon: 'phone-clock', color: '#3B82F6' },
    { key: 'calls_received', label: 'Calls', icon: 'phone-incoming', color: '#8B5CF6' },
    { key: 'time_spent', label: 'Time Spent', icon: 'timer', color: '#F97316' },
    { key: 'bet_wins', label: 'Bet Wins', icon: 'sword-cross', color: '#EF4444' },
];

function trophyColor(rank: number) {
    if (rank === 1) return '#F59E0B';
    if (rank === 2) return '#94A3B8';
    if (rank === 3) return '#B45309';
    return '#334155';
}

function formatStatValue(entry: any, rankBy: string) {
    switch (rankBy) {
        case 'coins': return `${entry.total_coins_earned} coins`;
        case 'money': return `₹${parseFloat(entry.total_money_earned).toFixed(2)}`;
        case 'call_duration': return `${Math.floor(entry.total_call_seconds / 60)}m`;
        case 'calls_received': return `${entry.total_calls_received} calls`;
        case 'time_spent': return `${Math.floor(entry.total_time_seconds / 3600)}h`;
        case 'bet_wins': return `${entry.bet_match_wins} wins`;
        default: return '';
    }
}

export default function LeagueScreen() {
    const [category, setCategory] = useState('coins');
    const [entries, setEntries] = useState<any[]>([]);
    const [myRank, setMyRank] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (cat: string) => {
        try {
            const [boardData, myData] = await Promise.all([
                leagueApi.getLeaderboard(cat),
                leagueApi.getMyRank(cat).catch(() => null),
            ]);
            setEntries(boardData.results || []);
            setMyRank(myData);
        } catch (e) {
            console.error('League load error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { setLoading(true); load(category); }, [category]);

    const onRefresh = () => { setRefreshing(true); load(category); };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🏆 League</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* My Rank Chip */}
            {myRank && (
                <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.myRankChip}>
                    <MaterialCommunityIcons name="account" size={18} color="#FFF" />
                    <Text style={styles.myRankText}>Your Rank: #{myRank.rank}</Text>
                    <Text style={styles.myRankValue}>{formatStatValue(myRank, category)}</Text>
                </LinearGradient>
            )}

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat.key}
                        style={[styles.tab, category === cat.key && { backgroundColor: cat.color + '22', borderColor: cat.color }]}
                        onPress={() => setCategory(cat.key)}
                    >
                        <MaterialCommunityIcons name={cat.icon} size={16} color={category === cat.key ? cat.color : '#64748B'} />
                        <Text style={[styles.tabLabel, category === cat.key && { color: cat.color }]}>{cat.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Leaderboard */}
            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
                >
                    {entries.map((entry, idx) => {
                        const photo = entry.photo
                            ? (getMediaUrl(entry.photo) || generateAvatarUrl(entry.user_id, entry.gender))
                            : generateAvatarUrl(entry.user_id, entry.gender);
                        const trophy = trophyColor(entry.rank);
                        const isTop3 = entry.rank <= 3;
                        return (
                            <TouchableOpacity key={entry.user_id} style={[styles.entryRow, isTop3 && styles.top3Row]} onPress={() => router.push(`/user/${entry.user_id}` as any)}>
                                {/* Rank */}
                                <View style={[styles.rankBadge, { backgroundColor: trophy + '22', borderColor: trophy + '66' }]}>
                                    {entry.rank <= 3
                                        ? <MaterialCommunityIcons name="trophy" size={16} color={trophy} />
                                        : <Text style={[styles.rankNum, { color: trophy }]}>#{entry.rank}</Text>
                                    }
                                </View>

                                {/* Avatar */}
                                <View style={styles.avatarWrap}>
                                    <Image source={{ uri: photo }} style={styles.avatar} />
                                    {entry.is_online && <View style={styles.onlineDot} />}
                                </View>

                                {/* Name + stat */}
                                <View style={styles.entryInfo}>
                                    <Text style={styles.entryName} numberOfLines={1}>{entry.display_name}</Text>
                                    <Text style={styles.entryStat}>{formatStatValue(entry, category)}</Text>
                                </View>

                                {/* Gender badge */}
                                <Text style={styles.genderText}>{entry.gender === 'M' ? '♂️' : entry.gender === 'F' ? '♀️' : '⚧️'}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {entries.length === 0 && (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="trophy-outline" size={60} color="#334155" />
                            <Text style={styles.emptyText}>No data yet</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
    myRankChip: { marginHorizontal: 20, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    myRankText: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
    myRankValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    tabsRow: { paddingHorizontal: 16, gap: 10, marginBottom: 14 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
    tabLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    listContent: { paddingHorizontal: 16, paddingBottom: 30 },
    entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
    top3Row: { borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.05)' },
    rankBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    rankNum: { fontSize: 11, fontWeight: '800' },
    avatarWrap: { position: 'relative' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E293B' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#0F172A' },
    entryInfo: { flex: 1 },
    entryName: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 2 },
    entryStat: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    genderText: { fontSize: 18 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { color: '#64748B', fontSize: 16, marginTop: 12 },
});
