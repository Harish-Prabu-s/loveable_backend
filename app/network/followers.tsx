import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { profilesApi } from '@/api/profiles';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useAuthStore } from '@/store/authStore';

export default function FollowersScreen() {
    const { userId } = useLocalSearchParams<{ userId?: string }>();
    const { user, isInitialized } = useAuthStore();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // If no userId is passed, show current authenticated user's followers
    const parsedUserId = (userId && !isNaN(parseInt(userId, 10))) ? parseInt(userId, 10) : undefined;
    const targetId = parsedUserId || user?.id;

    const load = useCallback(async () => {
        // We need either a specific userId or the current user from store
        // But the store must be initialized if we are relying on user.id
        if (!isInitialized) {
            console.log('[Followers] Waiting for store initialization...');
            return;
        }

        if (!targetId) {
            console.warn('[Followers] No targetId found yet.', { isInitialized, userId_param: userId, storeUserId: user?.id });
            setLoading(false); // Stop showing loader if we can't proceed
            return;
        }

        try {
            setLoading(true);
            console.log(`[Followers] Fetching followers for targetId: ${targetId} (Source: ${parsedUserId ? 'Param' : 'AuthStore'})`);
            const data = await profilesApi.getFollowers(targetId);
            const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
            console.log(`[Followers] Success! Received ${list.length} followers`);
            setUsers(list);
        } catch (error) {
            console.error('[Followers] API Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [targetId, isInitialized]);

    useEffect(() => {
        load();
    }, [load]);

    const renderItem = ({ item: profile }: { item: any }) => {
        const photoUrl = profile.photo
            ? (getMediaUrl(profile.photo) || generateAvatarUrl(profile.user, profile.gender))
            : generateAvatarUrl(profile.user, profile.gender);

        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => router.push(`/user/${profile.user}` as any)}
                activeOpacity={0.8}
            >
                <View style={styles.avatarWrap}>
                    <Image source={{ uri: photoUrl }} style={styles.avatar} />
                    {profile.is_online && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {profile.display_name || 'User'}
                    </Text>
                    {profile.username && (
                        <Text style={styles.userHandle}>@{profile.username}</Text>
                    )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Followers {users.length > 0 ? `(${users.length})` : ''}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={users.length === 0 ? styles.emptyContainer : styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(); }}
                            tintColor="#8B5CF6"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <MaterialCommunityIcons name="account-group-outline" size={64} color="#334155" />
                            <Text style={styles.emptyText}>No followers yet.</Text>
                            <Text style={styles.emptyHint}>Share your profile to get followers!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#1E293B',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 12, fontWeight: '600' },
    emptyHint: { color: '#475569', fontSize: 13, marginTop: 6 },
    listContent: { padding: 16, gap: 12 },
    userCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0F172A', padding: 14,
        borderRadius: 16, borderWidth: 1, borderColor: '#1E293B',
        marginBottom: 10,
    },
    avatarWrap: { position: 'relative', marginRight: 14 },
    avatar: {
        width: 52, height: 52, borderRadius: 26,
        borderWidth: 2, borderColor: '#334155',
    },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 13, height: 13, borderRadius: 7,
        backgroundColor: '#10B981', borderWidth: 2, borderColor: '#0F172A',
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '700', color: '#F8FAFC', marginBottom: 2 },
    userHandle: { fontSize: 12, color: '#94A3B8' },
});
