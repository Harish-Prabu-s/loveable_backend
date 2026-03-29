import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { closeFriendsApi, CloseFriend } from '@/api/closeFriends';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';

export default function CloseFriendsScreen() {
    const [friends, setFriends] = useState<CloseFriend[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const loadFriends = async () => {
        setLastError(null);
        try {
            console.log('[CloseFriends] Fetching list...');
            const data = await closeFriendsApi.list();
            console.log(`[CloseFriends] Loaded ${data.length} friends from API`);
            
            // Filter out any entries that missing the nested user object to prevent crashes
            const filtered = data.filter(f => !!f.close_friend);
            setFriends(filtered);
            
            if (data.length > 0 && filtered.length === 0) {
                console.warn("[CloseFriends] WARNING: Data was found but all items lacked 'close_friend' object.");
            }
        } catch (error: any) {
            console.error('Failed to load close friends:', error);
            setLastError(error?.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadFriends();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadFriends();
    };

    const handleRemove = async (id: number) => {
        try {
            await closeFriendsApi.remove(id);
            setFriends(prev => prev.filter(f => f.close_friend.user_id !== id));
        } catch (error) {
            console.error('Failed to remove close friend:', error);
            alert('Could not remove close friend.');
        }
    };

    const renderItem = ({ item }: { item: CloseFriend }) => {
        const u = item.close_friend;
        if (!u) return null; // Safety fallback
        return (
            <View style={styles.friendRow}>
                <Image
                    source={{ uri: getMediaUrl(u.photo) || generateAvatarUrl(u.id.toString(), u.gender as any) }}
                    style={styles.avatar}
                />
                <View style={styles.info}>
                    <Text style={styles.name}>{u.display_name || 'User'}</Text>
                    <Text style={styles.username}>@{u.username || 'unknown'}</Text>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(u.user_id)}>
                    <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEmpty = () => {
        if (lastError) {
            return (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#EF4444" />
                    <Text style={[styles.emptyText, { color: '#EF4444' }]}>Error Loading List</Text>
                    <Text style={styles.emptySub}>{lastError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="heart-outline" size={60} color="#334155" />
                <Text style={styles.emptyText}>You haven't added anyone to your Close Friends list yet.</Text>
                <Text style={styles.emptySub}>Go to a user's profile to add them.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Close Friends</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator color="#10B981" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={friends}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={renderEmpty}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    backBtn: { padding: 8, marginLeft: -8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    listContent: { padding: 20, gap: 16 },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#FFF' },
    username: { fontSize: 14, color: '#94A3B8' },
    removeBtn: {
        backgroundColor: '#334155',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16
    },
    removeText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: '#F1F5F9', fontSize: 16, marginTop: 16, textAlign: 'center', fontWeight: '600' },
    emptySub: { color: '#94A3B8', fontSize: 14, marginTop: 8, textAlign: 'center' },
    retryBtn: {
        marginTop: 16,
        backgroundColor: '#334155',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20
    },
    retryText: { color: '#FFF', fontSize: 14, fontWeight: '600' }
});
