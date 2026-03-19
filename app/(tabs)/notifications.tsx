import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, router } from 'expo-router';
import { notificationsApi, type Notification } from '@/api/notifications';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useNotifications } from '@/context/NotificationContext';

const NOTIFICATION_ICONS: Record<string, { name: any; color: string }> = {
    follow_request: { name: 'account-plus', color: '#8B5CF6' },
    follow_accepted: { name: 'account-check', color: '#10B981' },
    story_like: { name: 'heart', color: '#EF4444' },
    story_comment: { name: 'comment', color: '#3B82F6' },
    story_post: { name: 'image-plus', color: '#F59E0B' },
    user_online: { name: 'circle', color: '#10B981' },
    live_start: { name: 'broadcast', color: '#EF4444' },
    friend_request: { name: 'account-heart', color: '#EC4899' },
    friend_accepted: { name: 'account-heart-outline', color: '#10B981' },
    gift: { name: 'gift', color: '#F59E0B' },
    streak_upload: { name: 'fire', color: '#EF4444' },
    streak_comment: { name: 'comment-text-outline', color: '#EF4444' },
    screenshot: { name: 'camera-off', color: '#EF4444' },
};

function NotificationItem({ item, onRespond }: {
    item: Notification;
    onRespond?: (id: number, action: 'accept' | 'reject') => void;
}) {
    const icon = NOTIFICATION_ICONS[item.type] || { name: 'bell', color: '#8B5CF6' };
    const avatarUrl = item.actor?.photo
        ? getMediaUrl(item.actor.photo)
        : generateAvatarUrl(item.actor?.id || 'anon');

    return (
        <TouchableOpacity
            style={[styles.notifItem, !item.is_read && styles.unreadItem]}
            onPress={() => {
                if (item.type === 'story_like' || item.type === 'story_comment' || item.type === 'story_post') {
                    if (item.object_id) router.push(`/story/${item.object_id}` as any);
                } else if (item.type === 'streak_upload' || item.type === 'streak_comment') {
                    if (item.object_id) router.push(`/streak/${item.object_id}` as any);
                } else if (item.actor) {
                    router.push(`/user/${item.actor.id}` as any);
                }
            }}
        >
            <View style={styles.notifAvatarWrap}>
                <Image source={{ uri: avatarUrl }} style={styles.notifAvatar} />
                <View style={[styles.notifIconBadge, { backgroundColor: icon.color }]}>
                    <MaterialCommunityIcons name={icon.name} size={12} color="#FFF" />
                </View>
            </View>
            <View style={styles.notifContent}>
                <Text style={styles.notifMessage}>{item.message || item.type.replace(/_/g, ' ')}</Text>
                <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
                {(item.type === 'follow_request' || item.type === 'friend_request') && onRespond && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => onRespond(item.object_id!, 'accept')}>
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => onRespond(item.object_id!, 'reject')}>
                            <Text style={styles.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );
}

export default function NotificationsScreen() {
    const router = useRouter(); // Use the imported useRouter
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { newNotification } = useNotifications();

    const loadNotifications = useCallback(async () => {
        try {
            const data = await notificationsApi.getAll();
            setNotifications(Array.isArray(data?.results) ? data.results : []);
            setUnreadCount(data?.unread_count || 0);
        } catch (e) {
            console.error('Failed to load notifications', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        if (newNotification) {
            setNotifications(prev => {
                // Prevent duplicate notifications
                if (prev.find(n => n.id === newNotification.id)) return prev;
                return [newNotification, ...prev];
            });
            setUnreadCount(prev => prev + 1);
        }
    }, [newNotification]);

    const markAllRead = async () => {
        await notificationsApi.markRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const handleResponse = async (requestId: number, action: 'accept' | 'reject', type: string) => {
        try {
            if (type === 'follow_request') {
                await notificationsApi.respondFollowRequest(requestId, action);
            } else if (type === 'friend_request') {
                const { profilesApi } = await import('@/api/profiles');
                await profilesApi.respondFriendRequest(requestId, action);
            }
            Alert.alert(action === 'accept' ? '✓ Accepted' : 'Declined');
            await loadNotifications();
        } catch (e) {
            Alert.alert('Error', 'Could not process the request.');
        }
    };

    const requestNotifications = (notifications || []).filter(n => n.type === 'follow_request' || n.type === 'friend_request');
    const otherNotifications = (notifications || []).filter(n => n.type !== 'follow_request' && n.type !== 'friend_request');

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="bell-off-outline" size={60} color="#334155" />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} tintColor="#8B5CF6" />}
                    contentContainerStyle={{ paddingBottom: 30 }}
                >
                    {/* Requests Section */}
                    {requestNotifications.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Requests</Text>
                            {requestNotifications.map(n => (
                                <NotificationItem key={n.id} item={n} onRespond={(id, act) => handleResponse(id, act, n.type)} />
                            ))}
                        </>
                    )}

                    {/* All other notifications */}
                    {otherNotifications.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Activity</Text>
                            {otherNotifications.map(n => (
                                <NotificationItem key={n.id} item={n} />
                            ))}
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
    markAllText: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1,
        paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, textTransform: 'uppercase',
    },
    notifItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#0F172A',
    },
    unreadItem: { backgroundColor: 'rgba(139,92,246,0.05)' },
    notifAvatarWrap: { position: 'relative', marginRight: 14 },
    notifAvatar: { width: 48, height: 48, borderRadius: 24 },
    notifIconBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#020617',
    },
    notifContent: { flex: 1 },
    notifMessage: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, marginBottom: 4 },
    notifTime: { color: '#64748B', fontSize: 12 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    acceptBtn: {
        backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 8,
        borderRadius: 10, alignItems: 'center',
    },
    acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    rejectBtn: {
        backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 8,
        borderRadius: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center',
    },
    rejectBtnText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
    unreadDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#8B5CF6', marginTop: 4, marginLeft: 8,
    },
});
