import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { streaksApi } from '@/api/streaks';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';
import { useAuthStore } from '@/store/authStore';

import { StreakCircle, InlineStreakViewer, avatar } from '@/components/InlineStreakViewer';

export default function StreaksViewScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { user: currentUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'friends' | 'all'>('friends');
    const [streaks, setStreaks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    useEffect(() => {
        loadStreaks();
    }, [activeTab]);

    const loadStreaks = async () => {
        setLoading(true);
        try {
            const data = await streaksApi.getSnapchatStreaks(activeTab);
            setStreaks(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load streaks', e);
        } finally {
            setLoading(false);
        }
    };

    const nextViewer = () => {
        const idx = streaks.findIndex(u => u.user_id === selectedUser?.user_id);
        if (idx !== -1 && idx < streaks.length - 1) {
            setSelectedUser(streaks[idx + 1]);
        } else {
            setViewerVisible(false);
        }
    };

    const prevViewer = () => {
        const idx = streaks.findIndex(u => u.user_id === selectedUser?.user_id);
        if (idx > 0) {
            setSelectedUser(streaks[idx - 1]);
        }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return 'Recently';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const handleFireUser = async (u: any) => {
        try {
            const res = u.media?.id 
                ? await streaksApi.toggleFire(u.media.id)
                : await streaksApi.toggleUserFire(u.user_id);
                
            if (res.fired !== undefined) {
                setStreaks(prev => prev.map(s => 
                    s.user_id === u.user_id ? { ...s, streak_count: res.streak_count ?? (res.fired ? s.streak_count + 1 : Math.max(0, s.streak_count - 1)) } : s
                ));
            }
        } catch (e) {
            console.error('Failed to fire user', e);
        }
    };

    const renderUserCard = ({ item }: { item: any }) => {
        const isSentByMe = item.last_uploader_id === currentUser?.id;
        
        return (
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity 
                    style={styles.cardMainView}
                    onPress={() => {
                        setSelectedUser(item);
                        setViewerVisible(true);
                    }}
                >
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: item.media?.media_url || avatar(item.photo, item.user_id) }} 
                            style={styles.avatar} 
                        />
                        {item.media && <View style={styles.storyRing} />}
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.display_name || item.username}</Text>
                        <View style={styles.statusRow}>
                            <MaterialCommunityIcons 
                                name={isSentByMe ? "arrow-top-right" : "arrow-bottom-left"} 
                                size={14} 
                                color={isSentByMe ? colors.primary : "#10B981"} 
                            />
                            <Text style={[styles.statusText, { color: colors.textMuted }]}>
                                {isSentByMe ? 'Sent' : 'Received'} • {formatTime(item.last_updated)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.fireIconButton} onPress={() => handleFireUser(item)}>
                        <MaterialCommunityIcons name="fire" size={24} color="#EF4444" />
                        <Text style={styles.streakCountMini}>{item.streak_count}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Streaks</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'friends' && { backgroundColor: colors.primary }]}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' ? { color: '#FFF' } : { color: colors.textMuted }]}>Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'all' && { backgroundColor: colors.primary }]}
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' ? { color: '#FFF' } : { color: colors.textMuted }]}>All Users</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={streaks}
                    renderItem={renderUserCard}
                    keyExtractor={(item) => item.user_id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="fire-off" size={64} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No streaks yet</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Send a snap to start one!</Text>
                        </View>
                    }
                />
            )}

            <InlineStreakViewer 
                visible={viewerVisible} 
                user={selectedUser} 
                onClose={() => setViewerVisible(false)} 
                onNext={nextViewer} 
                onPrev={prevViewer} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1,
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    tabContainer: {
        flexDirection: 'row', padding: 16, gap: 12,
    },
    tab: {
        flex: 1, paddingVertical: 10, borderRadius: 20,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        alignItems: 'center',
    },
    tabText: { fontWeight: '700', fontSize: 14 },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, marginBottom: 12, borderRadius: 16,
        borderWidth: 1,
    },
    avatarContainer: { position: 'relative', marginRight: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1E293B' },
    storyRing: {
        position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
        borderRadius: 31, borderWidth: 3, borderColor: '#EF4444',
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusText: { fontSize: 13 },
    cardMainView: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    cardActions: { marginLeft: 10 },
    fireIconButton: { 
        flexDirection: 'row', alignItems: 'center', gap: 4, 
        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 
    },
    streakCountMini: { fontSize: 14, fontWeight: '800', color: '#EF4444' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyText: { fontSize: 20, fontWeight: '700', marginTop: 16 },
    emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
