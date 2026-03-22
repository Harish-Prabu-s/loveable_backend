/**
 * StreaksScreen (Tab Version)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Animated,
    Dimensions,
    Modal,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';
import { streaksApi } from '@/api/streaks';
import { useAuthStore } from '@/store/authStore';
import CreateStreakModal from '@/components/CreateStreak';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface StreakUser {
    user_id: number;
    display_name: string;
    username?: string;
    photo?: string;
    gender?: string;
    streak_count: number;
    last_updated?: string;
    media?: { id: number; media_url?: string; media_type?: string };
    likes?: number;
    comments?: number;
    is_active?: boolean;
}

interface Comment {
    id: number;
    user: string;
    avatar: string;
    text: string;
    time: string;
}

// Removed mock data - now using real backend API.

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function avatar(photo?: string, id?: number | string, gender?: string): string {
    if (photo && photo.startsWith('http')) return photo;
    return generateAvatarUrl(id ?? 'default', gender as any);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StreakCircle({ item, isMe, onAddPress, onPress }: any) {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;
    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]).start(() => {
            if (isMe) {
                if (item?.media) onPress?.(item);
                else onAddPress?.();
            } else if (item) {
                onPress?.(item);
            }
        });
    };
    const gradColors: [string, string, string] = item?.is_active
        ? ['#FF6B35', '#EF4444', '#7C3AED']
        : ['#4B5563', '#6B7280', '#9CA3AF'];
    const label = isMe ? 'Your Story' : (item?.display_name ?? item?.username ?? 'User').split(' ')[0];
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity style={styles.circleWrap} onPress={handlePress} activeOpacity={1}>
                <LinearGradient
                    colors={isMe ? ['#7C3AED', '#EC4899', '#EF4444'] : gradColors}
                    style={styles.circleGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={[styles.circleInner, { backgroundColor: colors.background }]}>
                        <Image 
                            source={{ uri: isMe ? avatar(item?.photo, 'me') : (item?.media?.media_url || avatar(item?.photo, item?.user_id, item?.gender)) }} 
                            style={styles.circleImg} 
                        />
                        {isMe && (
                            <TouchableOpacity 
                                style={styles.addOverlay} 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onAddPress?.();
                                }}
                            >
                                <View style={styles.addBubble}>
                                    <MaterialCommunityIcons name="plus" size={14} color="#FFF" />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
                {!isMe && item && item.streak_count > 0 && (
                    <View style={styles.flameBadge}>
                        <Text style={styles.flameBadgeTxt}>🔥{item.streak_count}</Text>
                    </View>
                )}
                <Text style={[styles.circleLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

function UserListItem({ item, onPress, onChatPress }: any) {
    const { colors } = useTheme();
    const hasMedia = !!item.media?.id;
    return (
        <TouchableOpacity
            style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
        >
            <View style={styles.listAvatarWrap}>
                {hasMedia ? (
                    <LinearGradient colors={['#FF6B35', '#EF4444', '#7C3AED']} style={styles.listGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <View style={[styles.listInner, { backgroundColor: colors.background }]}>
                            <Image 
                                source={{ uri: item.media?.media_url || avatar(item.photo, item.user_id) }} 
                                style={styles.listAvatar} 
                            />
                        </View>
                    </LinearGradient>
                ) : (
                    <Image 
                        source={{ uri: avatar(item.photo, item.user_id) }} 
                        style={[styles.listAvatarPlain, { borderColor: colors.border }]} 
                    />
                )}
            </View>
            <View style={styles.listInfo}>
                <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>{item.display_name}</Text>
                <View style={styles.listMeta}>
                    <MaterialCommunityIcons name="fire" size={13} color="#EF4444" />
                    <Text style={[styles.listMetaTxt, { color: colors.textSecondary }]}>{item.streak_count} day streak</Text>
                </View>
            </View>
            <TouchableOpacity style={[styles.chatBtn, { backgroundColor: colors.primaryLight }]} onPress={(e) => { e.stopPropagation(); onChatPress(item.user_id); }}>
                <MaterialCommunityIcons name="chat-processing-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// Header and Logic in StreaksScreen...

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN: StreaksScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function StreaksScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { user: currentUser } = useAuthStore();
    const [friends, setFriends] = useState<StreakUser[]>([]);
    const [all, setAll] = useState<StreakUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [viewerUser, setViewerUser] = useState<StreakUser | null>(null);
    const [viewerIndex, setViewerIndex] = useState<number>(0);

    useEffect(() => { load(); }, []);
    const load = async () => {
        setLoading(true);
        try {
            const [fd, ad] = await Promise.all([
                streaksApi.getSnapchatStreaks('friends').catch(() => []),
                streaksApi.getSnapchatStreaks('all').catch(() => []),
            ]);
            setFriends(Array.isArray(fd) ? fd : []);
            setAll(Array.isArray(ad) ? ad : []);
        } catch (err) {
            console.error('Error loading streaks:', err);
        } finally {
            setLoading(false);
        }
    };

    const myStreak = friends.find(u => u.user_id === currentUser?.id);
    const otherFriends = friends.filter(u => u.user_id !== currentUser?.id);

    const nextViewer = () => { if (viewerIndex + 1 < all.length) { setViewerIndex(v => v + 1); setViewerUser(all[viewerIndex + 1]); } };
    const prevViewer = () => { if (viewerIndex - 1 >= 0) { setViewerIndex(v => v - 1); setViewerUser(all[viewerIndex - 1]); } };
    const filtered = searchQ.trim() ? all.filter(u => (u.display_name + (u.username ?? '')).toLowerCase().includes(searchQ.toLowerCase())) : all;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Streaks 🔥</Text>
                <TouchableOpacity onPress={load} style={styles.iconBtn}><MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadBox}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={u => u.user_id.toString()}
                    contentContainerStyle={styles.listPad}
                    renderItem={({ item }) => <UserListItem item={item} onPress={(u: any) => { setViewerUser(u); setViewerIndex(all.findIndex(x => x.user_id === u.user_id)); }} onChatPress={(id: any) => router.push(`/chat/${id}` as any)} />}
                    ListHeaderComponent={
                        <>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circlesScroll}>
                                <StreakCircle 
                                    isMe 
                                    item={myStreak}
                                    onAddPress={() => setShowCreate(true)} 
                                    onPress={(u: any) => { setViewerUser(u); setViewerIndex(all.findIndex(x => x.user_id === u.user_id)); }}
                                />
                                {otherFriends.map(u => (
                                    <StreakCircle 
                                        key={u.user_id} 
                                        item={u} 
                                        onPress={(u: any) => { setViewerUser(u); setViewerIndex(all.findIndex(x => x.user_id === u.user_id)); }} 
                                    />
                                ))}
                            </ScrollView>

                            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                                <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search streaks..." placeholderTextColor={colors.textMuted} value={searchQ} onChangeText={setSearchQ} />
                            </View>
                        </>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
                <LinearGradient colors={['#7C3AED', '#EF4444']} style={styles.fabGrad}><MaterialCommunityIcons name="plus" size={30} color="#FFF" /></LinearGradient>
            </TouchableOpacity>

            <InlineStreakViewer visible={viewerUser !== null} user={viewerUser} onClose={() => setViewerUser(null)} onNext={nextViewer} onPrev={prevViewer} />
            <CreateStreakModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    iconBtn: { padding: 4 },
    loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    circlesScroll: { paddingHorizontal: 12, paddingVertical: 16 },
    circleWrap: { alignItems: 'center', marginRight: 16, width: 72 },
    circleGrad: { width: 68, height: 68, borderRadius: 34, padding: 2, alignItems: 'center', justifyContent: 'center' },
    circleInner: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#000' },
    circleImg: { width: 64, height: 64 },
    addOverlay: { position: 'absolute', bottom: -2, right: -2 },
    addBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
    circleLabel: { fontSize: 11, marginTop: 6, fontWeight: '500' },
    flameBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
    flameBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 0.5 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
    listPad: { paddingBottom: 100 },
    listCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 16, borderWidth: 0.5 },
    listAvatarWrap: { marginRight: 14 },
    listGrad: { width: 54, height: 54, borderRadius: 27, padding: 2, alignItems: 'center', justifyContent: 'center' },
    listInner: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
    listAvatar: { width: 50, height: 50 },
    listAvatarPlain: { width: 54, height: 54, borderRadius: 27, borderWidth: 1 },
    listInfo: { flex: 1 },
    listName: { fontSize: 16, fontWeight: '600' },
    listMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    listMetaTxt: { fontSize: 13, marginLeft: 4 },
    chatBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    fab: { position: 'absolute', bottom: 20, right: 20, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    fabGrad: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    viewerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
    viewerBgImg: { ...StyleSheet.absoluteFillObject },
    viewerDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    viewerSheet: { flex: 1 },
    viewerImg: { width: SCREEN_W, height: SCREEN_H },
    viewerTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10 },
    viewerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    viewerNavBtn: { padding: 4 },
    viewerUserRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    viewerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFF' },
    viewerName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    viewerStreakTxt: { color: '#FFF', fontSize: 12, opacity: 0.8 },
    closeBtn: { padding: 4 },
    actionsBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
    actionItem: { alignItems: 'center', marginHorizontal: 20 },
    actionCount: { color: '#FFF', fontSize: 12, marginTop: 4, fontWeight: '600' },
    fireEmoji: { fontSize: 24, opacity: 0.7 },
    fireEmojiActive: { opacity: 1 },

    // Modal & Comments
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    commentItem: { flexDirection: 'row', marginBottom: 16, gap: 12 },
    commentAvatar: { width: 36, height: 36, borderRadius: 18 },
    commentInfo: { flex: 1 },
    commentUser: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    commentText: { fontSize: 14, lineHeight: 20 },
    emptyMsg: { textAlign: 'center', marginTop: 40, fontSize: 15 },
    inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, gap: 12 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
});

function CommentsModal({ visible, uploadId, onClose, onCommentAdded }: any) {
    const { colors } = useTheme();
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (visible && uploadId) loadComments();
    }, [visible, uploadId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await streaksApi.listComments(uploadId);
            setComments(data);
        } catch (err) {
            console.error('Error loading comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await streaksApi.addComment(uploadId, text);
            setText('');
            loadComments();
            onCommentAdded?.();
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Comments ({comments.length})</Text>
                        <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                    
                    {loading ? (
                        <ActivityIndicator style={{ padding: 40 }} color={colors.primary} />
                    ) : (
                        <FlatList
                            data={comments}
                            keyExtractor={i => i.id.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.commentItem}>
                                    <Image source={{ uri: avatar(item.user.photo, item.user.id) }} style={styles.commentAvatar} />
                                    <View style={styles.commentInfo}>
                                        <Text style={[styles.commentUser, { color: colors.text }]}>{item.user.display_name || item.user.username}</Text>
                                        <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={[styles.emptyMsg, { color: colors.textMuted }]}>No comments yet. Be the first!</Text>}
                            contentContainerStyle={{ padding: 16 }}
                        />
                    )}

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Add a comment..."
                                placeholderTextColor={colors.textMuted}
                                value={text}
                                onChangeText={setText}
                                multiline
                            />
                            <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending}>
                                <MaterialCommunityIcons name="send" size={24} color={text.trim() ? colors.primary : colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
}

function InlineStreakViewer({ visible, user, onClose, onNext, onPrev }: any) {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(60)).current;
    const [liked, setLiked] = useState(false);
    const [fired, setFired] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [showComments, setShowComments] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const lastTap = useRef(0);
    const mediaList = user?.media_list || (user?.media ? [user.media] : []);
    const currentMedia = mediaList[currentIndex];

    useEffect(() => {
        if (user) { 
            setCurrentIndex(0);
            setLiked(user.media?.has_liked ?? false); 
            setFired(user.media?.has_fired ?? false); 
            setLikeCount(user.media?.likes_count ?? 0); 
            setCommentCount(user.media?.comments_count ?? 0);
            setShowComments(false); 
        }
    }, [user]);

    useEffect(() => {
        if (currentMedia) {
            setLiked(currentMedia.has_liked ?? false);
            setFired(currentMedia.has_fired ?? false);
            setLikeCount(currentMedia.likes_count ?? 0);
            setCommentCount(currentMedia.comments_count ?? 0);
        }
    }, [currentMedia]);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 60, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, fadeAnim, slideAnim]);

    const handleViewerPress = (e: any) => {
        const x = e.nativeEvent.locationX;
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Double tap - Like
            handleLikeToggle();
            lastTap.current = 0;
            return;
        }
        lastTap.current = now;

        // Single tap - Navigation
        if (x < SCREEN_W * 0.3) {
            // Left - Prev
            if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
            else onPrev?.();
        } else {
            // Right - Next
            if (currentIndex < mediaList.length - 1) setCurrentIndex(currentIndex + 1);
            else onNext?.();
        }
    };

    const handleLikeToggle = async () => {
        if (currentMedia?.id) {
            const res = await streaksApi.toggleLike(currentMedia.id);
            setLiked(res.liked);
            setLikeCount(c => res.liked ? c + 1 : c - 1);
        }
    };

    if (!visible || !user) return null;
    const imgUrl = user.media?.media_url ?? `https://picsum.photos/seed/${user.user_id}/800/1200`;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <View style={styles.viewerBg}>
                <Image source={{ uri: imgUrl }} style={styles.viewerBgImg} blurRadius={18} />
                <View style={styles.viewerDim} />
            </View>
            <View style={styles.viewerSheet}>
                <TouchableOpacity activeOpacity={1} onPress={handleViewerPress} style={StyleSheet.absoluteFill}>
                    <Image source={{ uri: currentMedia?.media_url || imgUrl }} style={styles.viewerImg} resizeMode="cover" />
                </TouchableOpacity>
                <SafeAreaView style={styles.viewerTopBar} edges={['top']}>
                    <View style={styles.viewerHeader}>
                        <TouchableOpacity onPress={onPrev} style={styles.viewerNavBtn}><MaterialCommunityIcons name="chevron-left" size={26} color="#FFF" /></TouchableOpacity>
                        <View style={styles.viewerUserRow}>
                            <Image source={{ uri: avatar(user.photo, user.user_id) }} style={styles.viewerAvatar} />
                            <View><Text style={styles.viewerName}>{user.display_name}</Text><Text style={styles.viewerStreakTxt}>🔥 {user.streak_count} day streak</Text></View>
                        </View>
                        <TouchableOpacity onPress={onNext} style={styles.viewerNavBtn}><MaterialCommunityIcons name="chevron-right" size={26} color="#FFF" /></TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}><MaterialCommunityIcons name="close" size={26} color="#FFF" /></TouchableOpacity>
                    </View>
                </SafeAreaView>
                <View style={[styles.actionsBar, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity style={styles.actionItem} onPress={handleLikeToggle}>
                        <MaterialCommunityIcons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? '#EF4444' : '#FFF'} /><Text style={styles.actionCount}>{likeCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={() => setShowComments(true)}>
                        <MaterialCommunityIcons name="comment-processing-outline" size={28} color="#FFF" /><Text style={styles.actionCount}>{commentCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={async () => {
                        if (currentMedia?.id) {
                            const res = await streaksApi.toggleFire(currentMedia.id);
                            setFired(res.fired);
                        }
                    }}>
                        <Text style={[styles.fireEmoji, fired && styles.fireEmojiActive]}>🔥</Text><Text style={styles.actionCount}>{fired ? 'Hot!' : 'Fire'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {currentMedia?.id && (
                <CommentsModal 
                    visible={showComments} 
                    uploadId={currentMedia.id} 
                    onClose={() => setShowComments(false)}
                    onCommentAdded={() => setCommentCount(c => c + 1)}
                />
            )}
        </Modal>
    );
}
