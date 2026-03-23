/**
 * StreaksLeaderboardScreen
 *
 * Displays the top streak holders in a premium leaderboard view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
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
    rank: number;
    name: string;
    photo: string | null;
    fire_count: number;
    streak: number;
}

export default function LeaderboardScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await streaksApi.getLeaderboard();
            setLeaderboard(data.map((item: any, idx: number) => ({
                id: item.user_id,
                rank: idx + 1,
                name: item.display_name || item.username,
                photo: item.photo,
                fire_count: item.fire_count || 0,
                streak: item.streak_count || 0,
            })));
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await streaksApi.getLeaderboard();
            setLeaderboard(data.map((item: any, idx: number) => ({
                id: item.user_id,
                rank: idx + 1,
                name: item.display_name || item.username,
                photo: item.photo,
                fire_count: item.fire_count || 0,
                streak: item.streak_count || 0,
            })));
        } catch (err) {
            console.error('Error refreshing leaderboard:', err);
        } finally {
            setRefreshing(false);
        }
    }, []);
    
    const handleFireUser = async (u: LeaderboardUser) => {
        try {
            const res = await streaksApi.toggleUserFire(u.id); 
            if (res.fired !== undefined) {
                setLeaderboard(prev => prev.map(s => 
                    s.id === u.id ? { 
                        ...s, 
                        fire_count: res.fire_count ?? (res.fired ? s.fire_count + 1 : Math.max(0, s.fire_count - 1)),
                        streak: res.streak_count ?? s.streak 
                    } : s
                ).sort((a, b) => b.fire_count - a.fire_count)
                 .map((item, idx) => ({ ...item, rank: idx + 1 })));
            }
        } catch (e) {
            console.error('Failed to fire user', e);
        }
    };

    const renderTopThree = () => (
        <View style={styles.topThreeContainer}>
            {leaderboard.slice(0, 3).map((user, idx) => (
                <TouchableOpacity 
                    key={user.id} 
                    style={[styles.topUser, idx === 0 && styles.firstPlace]}
                    onPress={() => router.push(`/user/${user.id}` as any)}
                >
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
                        <View style={[styles.topRankBadge, { backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                            <Text style={styles.topRankEmoji}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</Text>
                        </View>
                    </View>
                    <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                    <TouchableOpacity style={styles.topStreak} onPress={() => handleFireUser(user)}>
                        <MaterialCommunityIcons name="fire" size={16} color="#EF4444" />
                        <Text style={[styles.topStreakTxt, { color: colors.text }]}>{user.fire_count}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.topBestStreak, { color: colors.textSecondary }]}>🔥 {user.streak}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderItem = ({ item }: { item: LeaderboardUser }) => {
        const isTop3 = item.rank <= 3;
        const badgeColor = item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : item.rank === 3 ? '#CD7F32' : colors.surfaceAlt;

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/user/${item.id}` as any)}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.photo || generateAvatarUrl(item.id) }}
                        style={styles.avatar}
                    />
                    <View style={[styles.listRankBadge, { backgroundColor: badgeColor }]}>
                        <Text style={[styles.listRankText, { color: item.rank <= 3 ? '#000' : colors.text }]}>
                            {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoCol}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>

                <TouchableOpacity style={styles.streakCol} onPress={() => handleFireUser(item)}>
                    <MaterialCommunityIcons name="fire" size={20} color="#EF4444" />
                    <Text style={[styles.streakText, { color: colors.text }]}>{item.fire_count}</Text>
                </TouchableOpacity>
                <View style={styles.bestStreakBadge}>
                    <Text style={[styles.bestStreakText, { color: colors.textSecondary }]}>🔥{item.streak}</Text>
                </View>
            </TouchableOpacity>
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
                    <TouchableOpacity 
                        key={user.id} 
                        style={[styles.topUser, idx === 0 && styles.firstPlace]}
                        onPress={() => router.push(`/user/${user.id}` as any)}
                    >
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
                            <View style={[styles.topRankBadge, { backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                                <Text style={styles.topRankEmoji}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</Text>
                            </View>
                        </View>
                        <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                        <TouchableOpacity style={styles.topStreak} onPress={() => handleFireUser(user)}>
                            <MaterialCommunityIcons name="fire" size={16} color="#EF4444" />
                            <Text style={[styles.topStreakTxt, { color: colors.text }]}>{user.fire_count}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.topBestStreak, { color: colors.textSecondary }]}>🔥 {user.streak}</Text>
                    </TouchableOpacity>
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
        position: 'absolute', top: -10, alignSelf: 'center',
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
        borderWidth: 2, borderColor: '#FFF',
    },
    topRankEmoji: { fontSize: 16 },
    topRankText: { fontSize: 12, fontWeight: '800' },
    topName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
    topStreak: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    topStreakTxt: { fontSize: 13, fontWeight: '800' },
    topBestStreak: { fontSize: 10, opacity: 0.6, marginTop: 1 },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    card: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        borderRadius: 20, borderWidth: 1, marginBottom: 12,
    },
    avatarContainer: { position: 'relative' },
    listRankBadge: {
        position: 'absolute', top: -5, left: -5,
        minWidth: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFF',
        zIndex: 1,
    },
    listRankText: { fontSize: 10, fontWeight: '900' },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    infoCol: { flex: 1, marginLeft: 16, justifyContent: 'center' },
    name: { fontSize: 15, fontWeight: '600' },
    streakCol: { 
        flexDirection: 'row', alignItems: 'center', gap: 4, 
        paddingRight: 4, paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12
    },
    streakText: { fontSize: 16, fontWeight: '800' },
    bestStreakBadge: { marginLeft: 8, alignItems: 'flex-end', width: 40 },
    bestStreakText: { fontSize: 11, fontWeight: '600' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
