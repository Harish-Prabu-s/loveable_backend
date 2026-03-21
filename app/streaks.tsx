import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { chatApi } from '@/api/chat';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';
import { streaksApi, type Streak } from '@/api/streaks';
import * as ImagePicker from 'expo-image-picker';
import CreateStreakModal from '@/components/CreateStreak';

export default function StreaksScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [myStreaks, setMyStreaks] = useState<Streak[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);

    useEffect(() => {
        loadStreaks();
    }, []);

    const loadStreaks = async () => {
        try {
            const [leaderboardData, myStreaksData] = await Promise.all([
                chatApi.getStreakLeaderboard(),
                streaksApi.getStreaks()
            ]);
            setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
            setMyStreaks(Array.isArray(myStreaksData) ? myStreaksData : []);
        } catch (e) {
            console.error('Failed to load streaks', e);
        } finally {
            setLoading(false);
        }
    };

    const getAvatar = (photo?: string, id?: number, gender?: string) => {
        if (photo && photo.startsWith('http')) return photo;
        return generateAvatarUrl(id || 'default', gender as any);
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isTop3 = index < 3;
        const rankColor = index === 0 ? '#FBBF24' : index === 1 ? '#94A3B8' : index === 2 ? '#B45309' : colors.textMuted;
        
        return (
            <TouchableOpacity 
                key={item.user_id || index}
                style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => item.user_id && router.push(`/user/${item.user_id}` as any)}
            >
                <View style={styles.rankContainer}>
                    <Text style={[styles.rankText, { color: rankColor, fontSize: isTop3 ? 20 : 16, fontWeight: isTop3 ? '800' : '600' }]}>
                        #{index + 1}
                    </Text>
                </View>

                <Image source={{ uri: getAvatar(item.photo, item.user_id, item.gender) }} style={styles.avatar} />

                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{item.display_name || 'User'}</Text>
                    {item.is_online && (
                        <View style={styles.onlineBadge}>
                            <View style={styles.statusDot} />
                            <Text style={[styles.onlineText, { color: colors.textMuted }]}>Online</Text>
                        </View>
                    )}
                </View>

                <View style={styles.streakBadge}>
                    <MaterialCommunityIcons name="fire" size={20} color="#EF4444" />
                    <Text style={styles.streakCount}>{item.streak_count || 0}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Streaks</Text>
                <TouchableOpacity onPress={() => setShowUpload(true)} style={styles.uploadTrigger}>
                    <MaterialCommunityIcons name="fire" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerParams}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* My Streaks Horizontal Section */}
                    {myStreaks.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Streaks</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                {myStreaks.map(streak => (
                                    <TouchableOpacity 
                                        key={streak.streak_id} 
                                        style={styles.streakItem}
                                        onPress={() => {
                                            if ((streak as any).latest_upload_id) {
                                                router.push(`/streak/${(streak as any).latest_upload_id}` as any);
                                            } else {
                                                router.push(`/user/${streak.friend.user}` as any);
                                            }
                                        }}
                                    >
                                        <View style={styles.avatarContainer}>
                                            <Image 
                                                source={{ uri: getAvatar(streak.friend.photo, streak.friend.user, streak.friend.gender) }} 
                                                style={styles.streakAvatar} 
                                            />
                                            <View style={styles.countBadge}>
                                                <Text style={styles.countText}>{streak.streak_count}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.streakName, { color: colors.text }]} numberOfLines={1}>
                                            {streak.friend.display_name.split(' ')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Leaderboard Section */}
                    <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 16, marginTop: 10 }]}>Leaderboard</Text>
                    {leaderboard.length === 0 ? (
                        <View style={styles.emptyLeaderboard}>
                            <Text style={{ color: colors.textMuted }}>No streaks found</Text>
                        </View>
                    ) : (
                        leaderboard.map((item, index) => renderItem({ item, index }))
                    )}
                </ScrollView>
            )}

            <CreateStreakModal 
                visible={showUpload} 
                onClose={() => setShowUpload(false)} 
                onCreated={() => {
                    setShowUpload(false);
                    loadStreaks();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1,
    },
    uploadTrigger: {
        width: 40, height: 40, borderRadius: 20, 
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    section: { paddingVertical: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, paddingHorizontal: 16 },
    horizontalScroll: { paddingHorizontal: 12 },
    streakItem: { alignItems: 'center', marginRight: 16, width: 70 },
    avatarContainer: { position: 'relative' },
    streakAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#EF4444' },
    countBadge: {
        position: 'absolute', bottom: -4, right: -4,
        backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 10, borderWidth: 2, borderColor: '#020617',
    },
    countText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    streakName: { fontSize: 12, marginTop: 6, fontWeight: '600' },
    emptyLeaderboard: { padding: 40, alignItems: 'center' },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    centerParams: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyText: { fontSize: 20, fontWeight: '700', marginTop: 16 },
    emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8 },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, marginBottom: 12, borderRadius: 16,
        borderWidth: 1,
    },
    rankContainer: { width: 40, alignItems: 'center', marginRight: 8 },
    rankText: { fontSize: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E293B', marginRight: 16 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    onlineBadge: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
    onlineText: { fontSize: 12, fontWeight: '600' },
    streakBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    streakCount: { fontSize: 16, fontWeight: '800', color: '#EF4444', marginLeft: 4 },
});
