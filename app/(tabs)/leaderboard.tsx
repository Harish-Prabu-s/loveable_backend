/**
 * StreaksLeaderboardScreen
 *
 * Displays the top streak holders in a premium leaderboard view.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';
import { streaksApi } from '@/api/streaks';

interface LeaderboardUser {
    id: number;
    name: string;
    streak: number;
    rank: number;
    photo?: string;
    gender?: string;
}

const MOCK_LEADERBOARD: LeaderboardUser[] = [
    { id: 104, name: 'Sofia Kim', streak: 93, rank: 1, gender: 'female' },
    { id: 107, name: 'Ethan Cho', streak: 60, rank: 2, gender: 'male' },
    { id: 101, name: 'Alex Rivera', streak: 42, rank: 3, gender: 'male' },
    { id: 105, name: 'Marcus T.', streak: 21, rank: 4, gender: 'male' },
    { id: 102, name: 'Priya Singh', streak: 15, rank: 5, gender: 'female' },
    { id: 108, name: 'Nina Patel', streak: 11, rank: 6, gender: 'female' },
    { id: 103, name: 'Jordan Lee', streak: 7, rank: 7, gender: 'male' },
    { id: 106, name: 'Zara Nadeem', streak: 3, rank: 8, gender: 'female' },
];

export default function LeaderboardScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await streaksApi.getLeaderboard();
            // Data is [{ streak_count, user1: { id, display_name, photo }, user2: { ... } }, ...]
            // Flatten to unique users with their max streak
            const userMap = new Map<number, LeaderboardUser>();
            
            data.forEach((item: any) => {
                [item.user1, item.user2].forEach(u => {
                    const existing = userMap.get(u.id);
                    if (!existing || existing.streak < item.streak_count) {
                        userMap.set(u.id, {
                            id: u.id,
                            name: u.display_name || u.username,
                            streak: item.streak_count,
                            rank: 0, // Will settle later
                            photo: u.photo,
                        });
                    }
                });
            });

            const sorted = Array.from(userMap.values())
                .sort((a, b) => b.streak - a.streak)
                .map((u, idx) => ({ ...u, rank: idx + 1 }));

            setLeaderboard(sorted);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: LeaderboardUser }) => {
        const isTop3 = item.rank <= 3;
        const crownColor = item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32';

        return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.rankCol}>
                    <Text style={[styles.rankText, { color: isTop3 ? colors.primary : colors.textSecondary }]}>
                        {item.rank}
                    </Text>
                    {isTop3 && <MaterialCommunityIcons name="crown" size={14} color={crownColor} />}
                </View>

                <Image
                    source={{ uri: item.photo || generateAvatarUrl(item.id) }}
                    style={styles.avatar}
                />

                <View style={styles.infoCol}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>

                <View style={styles.streakCol}>
                    <MaterialCommunityIcons name="fire" size={16} color="#EF4444" />
                    <Text style={[styles.streakText, { color: colors.text }]}>{item.streak}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
                <TouchableOpacity onPress={load} style={styles.backBtn}>
                    <MaterialCommunityIcons name="refresh" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.topThreeContainer}>
                {leaderboard.slice(0, 3).map((user, idx) => (
                    <View key={user.id} style={[styles.topUser, idx === 0 && styles.firstPlace]}>
                        <View style={styles.topAvatarWrap}>
                            <LinearGradient
                                colors={idx === 0 ? ['#FFD700', '#FFA500'] : idx === 1 ? ['#C0C0C0', '#808080'] : ['#CD7F32', '#8B4513']}
                                style={styles.topGrad}
                            >
                                <Image
                                    source={{ uri: user.photo || generateAvatarUrl(user.id) }}
                                    style={styles.topAvatar}
                                />
                            </LinearGradient>
                            <View style={[styles.topRankBadge, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.topRankText, { color: colors.text }]}>{user.rank}</Text>
                            </View>
                        </View>
                        <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                        <View style={styles.topStreak}>
                            <MaterialCommunityIcons name="fire" size={14} color="#EF4444" />
                            <Text style={[styles.topStreakTxt, { color: colors.textSecondary }]}>{user.streak}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={leaderboard.slice(3)}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: { padding: 8 },
    title: { fontSize: 18, fontWeight: '700' },
    topThreeContainer: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
        paddingVertical: 24, paddingHorizontal: 16, gap: 12,
    },
    topUser: { alignItems: 'center', width: 90 },
    firstPlace: { marginBottom: 15 },
    topAvatarWrap: { position: 'relative', marginBottom: 8 },
    topGrad: { width: 64, height: 64, borderRadius: 32, padding: 3 },
    topAvatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#FFF' },
    topRankBadge: {
        position: 'absolute', bottom: -5, alignSelf: 'center',
        width: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2,
    },
    topRankText: { fontSize: 12, fontWeight: '800' },
    topName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
    topStreak: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    topStreakTxt: { fontSize: 11, fontWeight: '600' },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    card: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        borderRadius: 16, borderWidth: 1, marginBottom: 12,
    },
    rankCol: { width: 30, alignItems: 'center', gap: 2 },
    rankText: { fontSize: 15, fontWeight: '800' },
    avatar: { width: 44, height: 44, borderRadius: 22, marginHorizontal: 12 },
    infoCol: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' },
    streakCol: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 },
    streakText: { fontSize: 16, fontWeight: '800' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
