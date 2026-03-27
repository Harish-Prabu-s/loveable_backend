import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/authStore';
import { generateAvatarUrl } from '@/utils/avatar';
import { gamificationApi } from '@/api/gamification';

type LeagueTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

interface LeaderboardUser {
    id: string;
    name: string;
    avatar?: string;
    points: number;
    appUsageMinutes: number;
    callMinutes: number;
    league: LeagueTier;
    rank: number;
    streak?: number;
}

const LEAGUES: { tier: LeagueTier; minPoints: number; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { tier: 'Master', minPoints: 50000, color: '#A855F7', icon: 'crown' },
    { tier: 'Diamond', minPoints: 25000, color: '#60A5FA', icon: 'star' },
    { tier: 'Platinum', minPoints: 10000, color: '#22D3EE', icon: 'trophy' },
    { tier: 'Gold', minPoints: 5000, color: '#FACC15', icon: 'medal' },
    { tier: 'Silver', minPoints: 1000, color: '#9CA3AF', icon: 'medal' },
    { tier: 'Bronze', minPoints: 0, color: '#C2410C', icon: 'medal' },
];

const getLeague = (points: number) => {
    return LEAGUES.find(l => points >= l.minPoints) || LEAGUES[LEAGUES.length - 1];
};

// Mock Data Generator
const generateMockLeaderboard = (): LeaderboardUser[] => {
    const users = [
        { id: '1', name: 'Priya Sharma', points: 52000, appUsageMinutes: 120, callMinutes: 300, streak: 15 },
        { id: '2', name: 'Anjali Gupta', points: 28000, appUsageMinutes: 90, callMinutes: 150, streak: 8 },
        { id: '3', name: 'Sneha Patel', points: 12000, appUsageMinutes: 60, callMinutes: 80, streak: 5 },
        { id: '4', name: 'Riya Singh', points: 6000, appUsageMinutes: 45, callMinutes: 40, streak: 12 },
        { id: '5', name: 'Neha Verma', points: 2000, appUsageMinutes: 30, callMinutes: 20, streak: 0 },
        { id: '6', name: 'Kavita Rao', points: 500, appUsageMinutes: 15, callMinutes: 10, streak: 2 },
        { id: '7', name: 'Meera Reddy', points: 45000, appUsageMinutes: 110, callMinutes: 250, streak: 20 },
        { id: '8', name: 'Pooja Kumar', points: 8000, appUsageMinutes: 50, callMinutes: 60, streak: 3 },
    ];

    return users.sort((a, b) => b.points - a.points).map((u, index) => ({
        ...u,
        rank: index + 1,
        league: getLeague(u.points).tier,
    }));
};

const { width } = Dimensions.get('window');

export default function LeaderboardScreen() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'global' | 'streaks' | 'video' | 'audio'>('global');
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [streakUsers, setStreakUsers] = useState<any[]>([]);
    const [videoUsers, setVideoUsers] = useState<any[]>([]);
    const [audioUsers, setAudioUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'global') {
                setUsers(generateMockLeaderboard());
            } else if (activeTab === 'streaks') {
                const data = await gamificationApi.getStreakLeaderboard();
                setStreakUsers(data);
            } else if (activeTab === 'video') {
                const data = await gamificationApi.getVideoCallLeaderboard();
                setVideoUsers(data);
            } else if (activeTab === 'audio') {
                const data = await gamificationApi.getAudioCallLeaderboard();
                setAudioUsers(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const currentUserStats: LeaderboardUser = {
        id: 'me',
        name: user?.phone_number || 'You',
        points: 1500,
        appUsageMinutes: 25,
        callMinutes: 15,
        rank: 99,
        league: getLeague(1500).tier
    };

    const currentLeague = getLeague(currentUserStats.points);

    return (
        <View style={styles.container}>
            <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Section (Dark Theme) */}
                <View style={styles.headerSection}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.headerTop}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Leaderboard</Text>
                        </View>

                        {/* Current User Card */}
                        <View style={styles.currentUserCard}>
                            <View style={styles.currentUserHeader}>
                                <View style={styles.currentUserProfile}>
                                    <Image
                                        source={{ uri: generateAvatarUrl(user?.phone_number || 'me', user?.gender as any) }}
                                        style={styles.currentUserAvatar}
                                    />
                                    <View>
                                        <Text style={styles.currentUserName}>{user?.phone_number || 'Guest'}</Text>
                                        <View style={styles.leagueBadge}>
                                            <MaterialCommunityIcons name={currentLeague.icon} size={16} color={currentLeague.color} />
                                            <Text style={[styles.leagueText, { color: currentLeague.color }]}>
                                                {currentLeague.tier} League
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.currentUserPointsBox}>
                                    <Text style={styles.pointsLarge}>{currentUserStats.points.toLocaleString()}</Text>
                                    <Text style={styles.pointsLabel}>Total Points</Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <MaterialCommunityIcons name="clock-outline" size={16} color="#60A5FA" />
                                    <Text style={styles.statLabel}>{currentUserStats.appUsageMinutes} min App Usage</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <MaterialCommunityIcons name="phone" size={16} color="#4ADE80" />
                                    <Text style={styles.statLabel}>{currentUserStats.callMinutes} min Calls</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Tabs */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.tabsContainer}
                    style={{ maxHeight: 60 }}
                >
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'global' && styles.activeTabButton]}
                        onPress={() => setActiveTab('global')}
                    >
                        <Text style={[styles.tabText, activeTab === 'global' && styles.activeTabText]}>Global</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'streaks' && styles.activeTabButton]}
                        onPress={() => setActiveTab('streaks')}
                    >
                        <Text style={[styles.tabText, activeTab === 'streaks' && styles.activeTabText]}>Streaks 🔥</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'video' && styles.activeTabButton]}
                        onPress={() => setActiveTab('video')}
                    >
                        <Text style={[styles.tabText, activeTab === 'video' && styles.activeTabText]}>Video 🎥</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'audio' && styles.activeTabButton]}
                        onPress={() => setActiveTab('audio')}
                    >
                        <Text style={[styles.tabText, activeTab === 'audio' && styles.activeTabText]}>Audio 🎧</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* List Section */}
                <View style={styles.listSection}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 20 }} />
                    ) : (
                        activeTab === 'global' ? users.map((u) => {
                            const leagueInfo = getLeague(u.points);
                            const isTop3 = u.rank <= 3;
                            return (
                                <View key={u.id} style={styles.listItem}>
                                    <Text style={[styles.rankText, isTop3 && styles.rankTextTop3]}>#{u.rank}</Text>
                                    <Image source={{ uri: generateAvatarUrl(u.id, undefined) }} style={styles.itemAvatar} />
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{u.name}</Text>
                                        <View style={styles.itemSubtext}>
                                            <Text style={[styles.itemLeague, { color: leagueInfo.color }]}>{leagueInfo.tier}</Text>
                                            <Text style={styles.itemMinutes}> • {u.callMinutes} min calls</Text>
                                            {u.streak && u.streak > 0 ? (
                                                <Text style={[styles.itemMinutes, { color: '#EF4444', fontWeight: 'bold' }]}> • 🔥 {u.streak}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                    <View style={styles.itemPointsBox}>
                                        <Text style={styles.itemPoints}>{u.points.toLocaleString()}</Text>
                                        <Text style={styles.itemPointsLabel}>Pts</Text>
                                    </View>
                                </View>
                            );
                        }) : 
                        activeTab === 'streaks' ? streakUsers.map((item, index) => {
                            const isTop3 = index < 3;
                            return (
                                <TouchableOpacity key={item.user_id} style={styles.listItem} onPress={() => router.push(`/user/${item.user_id}` as any)}>
                                    <Text style={[styles.rankText, isTop3 && styles.rankTextTop3]}>#{index + 1}</Text>
                                    <Image source={{ uri: item.profile_pic || generateAvatarUrl(item.user_id, 'M') }} style={styles.itemAvatar} />
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.display_name || item.username}</Text>
                                        <Text style={styles.itemMinutes}>@{item.username}</Text>
                                    </View>
                                    <View style={styles.itemPointsBox}>
                                        <Text style={[styles.itemPoints, { color: '#EF4444' }]}>🔥 {item.streak_count}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }) :
                        (activeTab === 'video' ? videoUsers : audioUsers).map((item, index) => {
                            const isVideo = activeTab === 'video';
                            const isTop3 = index < 3;
                            const formatDuration = (seconds: number) => {
                                const hrs = Math.floor(seconds / 3600);
                                const mins = Math.floor((seconds % 3600) / 60);
                                if (hrs > 0) return `${hrs}h ${mins}m`;
                                return `${mins}m`;
                            };
                            return (
                                <TouchableOpacity key={item.user_id} style={styles.listItem} onPress={() => router.push(`/user/${item.user_id}` as any)}>
                                    <Text style={[styles.rankText, isTop3 && styles.rankTextTop3]}>#{index + 1}</Text>
                                    <Image source={{ uri: item.profile_pic || generateAvatarUrl(item.user_id, 'M') }} style={styles.itemAvatar} />
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.display_name || item.username}</Text>
                                        <Text style={styles.itemMinutes}>@{item.username}</Text>
                                    </View>
                                    <View style={styles.itemPointsBox}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <MaterialCommunityIcons name={isVideo ? "video" : "phone"} size={14} color={isVideo ? "#3B82F6" : "#10B981"} />
                                            <Text style={[styles.itemPoints, { color: isVideo ? "#3B82F6" : "#10B981" }]}>
                                                {formatDuration(item.total_duration)}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        flexGrow: 1,
    },
    headerSection: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 24,
        paddingBottom: 40,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 16,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    currentUserCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    currentUserHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    currentUserProfile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentUserAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#8B5CF6',
        marginRight: 12,
        backgroundColor: '#334155',
    },
    currentUserName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    leagueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leagueText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    currentUserPointsBox: {
        alignItems: 'flex-end',
    },
    pointsLarge: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    pointsLabel: {
        fontSize: 12,
        color: '#94A3B8',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 8,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#E2E8F0',
        marginLeft: 6,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        justifyContent: 'center',
        gap: 12,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
    },
    activeTabButton: {
        backgroundColor: '#8B5CF6',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    listSection: {
        padding: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    rankText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#94A3B8',
        width: 32,
        textAlign: 'center',
    },
    rankTextTop3: {
        color: '#EAB308',
    },
    itemAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#F1F5F9',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    itemSubtext: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    itemLeague: {
        fontSize: 12,
        fontWeight: '600',
    },
    itemMinutes: {
        fontSize: 12,
        color: '#64748B',
    },
    itemPointsBox: {
        alignItems: 'flex-end',
    },
    itemPoints: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    itemPointsLabel: {
        fontSize: 10,
        color: '#94A3B8',
    }
});
