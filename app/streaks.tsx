/**
 * StreaksScreen
 *
 * Instagram Stories + Snapchat Streaks – fully self-contained screen.
 *
 * Layout (top → bottom):
 *   1.  Header
 *   2.  Horizontal circle row  (first = "add yours", rest = friends)
 *   3.  Reaction quick-bar     (❤️ Fire 💬)
 *   4.  Search bar
 *   5.  FlatList user cards    (avatar · name · streak · chat icon)
 *   6.  Full-screen streak viewer overlay (animated, with actions)
 *   7.  Create streak modal
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

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA (fallback when API is empty / offline)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USERS: StreakUser[] = [
    { user_id: 1, display_name: 'Alex Rivera', username: 'alex_r', streak_count: 42, is_active: true, likes: 128, comments: 23, media: { id: 101, media_url: 'https://picsum.photos/seed/streak1/800/1200', media_type: 'image' } },
    { user_id: 2, display_name: 'Priya Singh', username: 'priya_s', streak_count: 15, is_active: true, likes: 64, comments: 8, media: { id: 102, media_url: 'https://picsum.photos/seed/streak2/800/1200', media_type: 'image' } },
    { user_id: 3, display_name: 'Jordan Lee', username: 'j_lee', streak_count: 7, is_active: false, likes: 30, comments: 5 },
    { user_id: 4, display_name: 'Sofia Kim', username: 'sofia_k', streak_count: 93, is_active: true, likes: 310, comments: 47, media: { id: 103, media_url: 'https://picsum.photos/seed/streak3/800/1200', media_type: 'image' } },
    { user_id: 5, display_name: 'Marcus T.', username: 'marcus_t', streak_count: 21, is_active: true, likes: 55, comments: 12, media: { id: 104, media_url: 'https://picsum.photos/seed/streak4/800/1200', media_type: 'image' } },
    { user_id: 6, display_name: 'Zara Nadeem', username: 'zara_n', streak_count: 3, is_active: false, likes: 10, comments: 2 },
    { user_id: 7, display_name: 'Ethan Cho', username: 'ethan_c', streak_count: 60, is_active: true, likes: 200, comments: 38, media: { id: 105, media_url: 'https://picsum.photos/seed/streak5/800/1200', media_type: 'image' } },
    { user_id: 8, display_name: 'Nina Patel', username: 'nina_p', streak_count: 11, is_active: true, likes: 44, comments: 7, media: { id: 106, media_url: 'https://picsum.photos/seed/streak6/800/1200', media_type: 'image' } },
];

const MOCK_COMMENTS: Comment[] = [
    { id: 1, user: 'Alex Rivera', avatar: 'https://i.pravatar.cc/80?u=1', text: '🔥 Killing it every day!', time: '2m ago' },
    { id: 2, user: 'Priya Singh', avatar: 'https://i.pravatar.cc/80?u=2', text: 'Keep the streak going 💪', time: '5m ago' },
    { id: 3, user: 'Sofia Kim', avatar: 'https://i.pravatar.cc/80?u=4', text: 'Amazing consistency ❤️', time: '12m ago' },
    { id: 4, user: 'Marcus T.', avatar: 'https://i.pravatar.cc/80?u=5', text: 'Goals 🎯', time: '20m ago' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function avatar(photo?: string, id?: number | string, gender?: string): string {
    if (photo && photo.startsWith('http')) return photo;
    return generateAvatarUrl(id ?? 'default', gender as any);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: StreakCircle
// ─────────────────────────────────────────────────────────────────────────────

interface StreakCircleProps {
    item: StreakUser | null;
    isMe?: boolean;
    onAddPress?: () => void;
    onPress?: (item: StreakUser) => void;
}

function StreakCircle({ item, isMe, onAddPress, onPress }: StreakCircleProps) {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]).start(() => {
            if (isMe) onAddPress?.();
            else if (item) onPress?.(item);
        });
    };

    const gradColors: [string, string, string] = item?.is_active
        ? ['#FF6B35', '#EF4444', '#7C3AED']
        : ['#4B5563', '#6B7280', '#9CA3AF'];

    const label = isMe
        ? 'Your Story'
        : (item?.display_name ?? item?.username ?? 'User').split(' ')[0];

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
                        {isMe ? (
                            <View style={[styles.circleAddBg, { backgroundColor: colors.surfaceAlt }]}>
                                <Image
                                    source={{ uri: avatar(undefined, 'me') }}
                                    style={styles.circleImg}
                                />
                                {/* "+" overlay */}
                                <View style={styles.addOverlay}>
                                    <View style={styles.addBubble}>
                                        <MaterialCommunityIcons name="plus" size={14} color="#FFF" />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <Image
                                source={{ uri: avatar(item?.photo, item?.user_id, item?.gender) }}
                                style={styles.circleImg}
                            />
                        )}
                    </View>
                </LinearGradient>
                {/* Streak count badge */}
                {!isMe && item && item.streak_count > 0 && (
                    <View style={styles.flameBadge}>
                        <Text style={styles.flameBadgeTxt}>🔥{item.streak_count}</Text>
                    </View>
                )}
                <Text style={[styles.circleLabel, { color: colors.text }]} numberOfLines={1}>
                    {label}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: UserListItem
// ─────────────────────────────────────────────────────────────────────────────

interface UserListItemProps {
    item: StreakUser;
    onPress: (item: StreakUser) => void;
    onChatPress: (userId: number) => void;
}

function UserListItem({ item, onPress, onChatPress }: UserListItemProps) {
    const { colors } = useTheme();
    const hasMedia = !!item.media?.id;

    return (
        <TouchableOpacity
            style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onPress(item)}
            activeOpacity={0.8}
        >
            {/* Avatar */}
            <View style={styles.listAvatarWrap}>
                {hasMedia ? (
                    <LinearGradient
                        colors={['#FF6B35', '#EF4444', '#7C3AED']}
                        style={styles.listGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={[styles.listInner, { backgroundColor: colors.background }]}>
                            <Image source={{ uri: avatar(item.photo, item.user_id) }} style={styles.listAvatar} />
                        </View>
                    </LinearGradient>
                ) : (
                    <Image
                        source={{ uri: avatar(item.photo, item.user_id) }}
                        style={[styles.listAvatarPlain, { borderColor: colors.border }]}
                    />
                )}
            </View>

            {/* Info */}
            <View style={styles.listInfo}>
                <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                    {item.display_name}
                </Text>
                <View style={styles.listMeta}>
                    <MaterialCommunityIcons name="fire" size={13} color="#EF4444" />
                    <Text style={[styles.listMetaTxt, { color: colors.textSecondary }]}>
                        {item.streak_count} day streak
                    </Text>
                    {hasMedia && (
                        <View style={[styles.newPill, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.newPillTxt, { color: colors.primary }]}>NEW</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Chat button */}
            <TouchableOpacity
                style={[styles.chatBtn, { backgroundColor: colors.primaryLight }]}
                onPress={(e) => { e.stopPropagation(); onChatPress(item.user_id); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MaterialCommunityIcons name="chat-processing-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Full-Screen StreakViewer (inline, animated)
// ─────────────────────────────────────────────────────────────────────────────

interface ViewerProps {
    visible: boolean;
    user: StreakUser | null;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

function InlineStreakViewer({ visible, user, onClose, onNext, onPrev }: ViewerProps) {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(60)).current;
    const [liked, setLiked] = useState(false);
    const [fired, setFired] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [localComments, setLocalComments] = useState<Comment[]>([...MOCK_COMMENTS]);

    useEffect(() => {
        if (user) {
            setLiked(false);
            setFired(false);
            setLikeCount(user.likes ?? 0);
            setShowComments(false);
        }
    }, [user]);

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
    }, [visible]);

    const toggleLike = () => {
        setLiked(v => {
            setLikeCount(c => v ? c - 1 : c + 1);
            return !v;
        });
    };

    const sendComment = () => {
        if (!commentText.trim()) return;
        setLocalComments(prev => [
            { id: Date.now(), user: 'You', avatar: 'https://i.pravatar.cc/80?u=me', text: commentText.trim(), time: 'Just now' },
            ...prev,
        ]);
        setCommentText('');
    };

    if (!visible || !user) return null;

    const imgUrl = user.media?.media_url ?? `https://picsum.photos/seed/${user.user_id}/800/1200`;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <Animated.View style={[styles.viewerBg, { opacity: fadeAnim }]}>
                {/* Background image */}
                <Image source={{ uri: imgUrl }} style={styles.viewerBgImg} blurRadius={18} />
                <View style={styles.viewerDim} />
            </Animated.View>

            <Animated.View style={[styles.viewerSheet, { transform: [{ translateY: slideAnim }] }]}>
                {/* Content image */}
                <View style={styles.viewerImgWrap}>
                    <Image source={{ uri: imgUrl }} style={styles.viewerImg} resizeMode="cover" />
                </View>

                {/* Top bar */}
                <SafeAreaView style={styles.viewerTopBar} edges={['top']}>
                    {/* Progress dots */}
                    <View style={styles.progressRow}>
                        <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
                    </View>

                    <View style={styles.viewerHeader}>
                        <TouchableOpacity onPress={onPrev} style={styles.viewerNavBtn}>
                            <MaterialCommunityIcons name="chevron-left" size={26} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        {/* User info */}
                        <View style={styles.viewerUserRow}>
                            <Image
                                source={{ uri: avatar(user.photo, user.user_id) }}
                                style={styles.viewerAvatar}
                            />
                            <View>
                                <Text style={styles.viewerName}>{user.display_name}</Text>
                                <View style={styles.viewerStreakRow}>
                                    <Text style={styles.viewerStreakTxt}>🔥 {user.streak_count} day streak</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity onPress={onNext} style={styles.viewerNavBtn}>
                            <MaterialCommunityIcons name="chevron-right" size={26} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={26} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Actions bar */}
                <View style={[styles.actionsBar, { paddingBottom: insets.bottom + 16 }]}>
                    {/* Like */}
                    <TouchableOpacity style={styles.actionItem} onPress={toggleLike}>
                        <MaterialCommunityIcons
                            name={liked ? 'heart' : 'heart-outline'}
                            size={28}
                            color={liked ? '#EF4444' : '#FFF'}
                        />
                        <Text style={styles.actionCount}>{likeCount}</Text>
                    </TouchableOpacity>

                    {/* Comment */}
                    <TouchableOpacity style={styles.actionItem} onPress={() => setShowComments(true)}>
                        <MaterialCommunityIcons name="comment-processing-outline" size={28} color="#FFF" />
                        <Text style={styles.actionCount}>{localComments.length}</Text>
                    </TouchableOpacity>

                    {/* Fire reaction */}
                    <TouchableOpacity style={styles.actionItem} onPress={() => setFired(v => !v)}>
                        <Text style={[styles.fireEmoji, fired && styles.fireEmojiActive]}>🔥</Text>
                        <Text style={styles.actionCount}>{fired ? 'Hot!' : 'Fire'}</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    {/* Share */}
                    <TouchableOpacity style={styles.actionItem}>
                        <MaterialCommunityIcons name="share-variant-outline" size={26} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Comments bottom sheet */}
            {showComments && (
                <Animated.View style={[styles.commentSheet, { paddingBottom: insets.bottom }]}>
                    <View style={styles.commentHandle} />
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentTitle}>Comments ({localComments.length})</Text>
                        <TouchableOpacity onPress={() => setShowComments(false)}>
                            <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={localComments}
                        keyExtractor={c => c.id.toString()}
                        style={{ maxHeight: SCREEN_H * 0.35 }}
                        renderItem={({ item: c }) => (
                            <View style={styles.commentItem}>
                                <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
                                <View style={styles.commentBody}>
                                    <Text style={styles.commentUser}>{c.user}</Text>
                                    <Text style={styles.commentText}>{c.text}</Text>
                                </View>
                                <Text style={styles.commentTime}>{c.time}</Text>
                            </View>
                        )}
                    />

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={styles.commentInputRow}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment…"
                                placeholderTextColor="#64748B"
                                value={commentText}
                                onChangeText={setCommentText}
                                returnKeyType="send"
                                onSubmitEditing={sendComment}
                            />
                            <TouchableOpacity onPress={sendComment} style={styles.sendBtn}>
                                <MaterialCommunityIcons name="send" size={20} color="#7C3AED" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            )}
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN: StreaksScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function StreaksScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { user: currentUser } = useAuthStore();

    // Data
    const [friends, setFriends] = useState<StreakUser[]>([]);
    const [all, setAll] = useState<StreakUser[]>([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [showCreate, setShowCreate] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [viewerUser, setViewerUser] = useState<StreakUser | null>(null);
    const [viewerIndex, setViewerIndex] = useState<number>(0);

    // ── Load data ──
    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [fd, ad] = await Promise.all([
                streaksApi.getSnapchatStreaks('friends').catch(() => [] as any[]),
                streaksApi.getSnapchatStreaks('all').catch(() => [] as any[]),
            ]);
            const friendsArr: StreakUser[] = Array.isArray(fd) && fd.length > 0 ? fd : MOCK_USERS;
            const allArr: StreakUser[] = Array.isArray(ad) && ad.length > 0 ? ad : MOCK_USERS;
            setFriends(friendsArr);
            setAll(allArr);
        } catch {
            setFriends(MOCK_USERS);
            setAll(MOCK_USERS);
        } finally {
            setLoading(false);
        }
    };

    // ── Open viewer ──
    const openViewer = useCallback((item: StreakUser) => {
        const idx = all.findIndex(u => u.user_id === item.user_id);
        setViewerIndex(idx >= 0 ? idx : 0);
        setViewerUser(item);
    }, [all]);

    const nextViewer = () => {
        const next = viewerIndex + 1;
        if (next < all.length) { setViewerIndex(next); setViewerUser(all[next]); }
    };
    const prevViewer = () => {
        const prev = viewerIndex - 1;
        if (prev >= 0) { setViewerIndex(prev); setViewerUser(all[prev]); }
    };

    // ── Chat navigation ──
    const goChat = (userId: number) => router.push(`/chat/${userId}` as any);

    // ── Filter ──
    const filtered = searchQ.trim()
        ? all.filter(u => (u.display_name + ' ' + (u.username ?? '')).toLowerCase().includes(searchQ.toLowerCase()))
        : all;

    // Circles (friends with active streaks first)
    const circleUsers = [...friends].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)).slice(0, 10);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Streaks</Text>
                <TouchableOpacity onPress={load} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadTxt, { color: colors.textMuted }]}>Loading streaks…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={u => u.user_id.toString()}
                    contentContainerStyle={styles.listPad}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <UserListItem item={item} onPress={openViewer} onChatPress={goChat} />
                    )}
                    ListHeaderComponent={
                        <>
                            {/* ── Story circles ── */}
                            <View style={styles.circlesSection}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.circlesScroll}
                                >
                                    {/* "Add yours" circle */}
                                    <StreakCircle isMe onAddPress={() => setShowCreate(true)} item={null} />

                                    {/* Friend circles */}
                                    {circleUsers.map(u => (
                                        <StreakCircle key={u.user_id} item={u} onPress={openViewer} />
                                    ))}
                                </ScrollView>
                            </View>

                            {/* ── Reaction quick-bar ── */}
                            <View style={styles.quickBar}>
                                {([
                                    { icon: 'heart-outline', label: '❤️ Like', color: '#EF4444' },
                                    { icon: 'fire', label: '🔥 Fire', color: '#F97316' },
                                    { icon: 'comment-processing-outline', label: '💬 Comment', color: colors.primary },
                                ] as const).map(r => (
                                    <TouchableOpacity
                                        key={r.label}
                                        style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    >
                                        <MaterialCommunityIcons name={r.icon as any} size={16} color={r.color} />
                                        <Text style={[styles.quickBtnTxt, { color: colors.textSecondary }]}>{r.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* ── Search bar ── */}
                            <View style={[styles.searchBar, {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            }]}>
                                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search users…"
                                    placeholderTextColor={colors.textMuted}
                                    value={searchQ}
                                    onChangeText={setSearchQ}
                                />
                                {searchQ.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQ('')}>
                                        <MaterialCommunityIcons name="close-circle" size={17} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* ── Section label ── */}
                            <Text style={[styles.sectionLbl, { color: colors.textSecondary }]}>
                                {searchQ.trim()
                                    ? `Results for "${searchQ}"`
                                    : `All Streaks · ${filtered.length}`}
                            </Text>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <LinearGradient
                                colors={['rgba(239,68,68,0.15)', 'rgba(124,58,237,0.15)']}
                                style={styles.emptyGrad}
                            >
                                <Text style={styles.emptyEmoji}>🔥</Text>
                            </LinearGradient>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                {searchQ ? 'No users found' : 'No streaks yet'}
                            </Text>
                            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                                {searchQ ? 'Try a different name' : 'Post your first streak and get the fire going!'}
                            </Text>
                            {!searchQ && (
                                <TouchableOpacity
                                    style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => setShowCreate(true)}
                                >
                                    <MaterialCommunityIcons name="fire" size={17} color="#FFF" />
                                    <Text style={styles.emptyBtnTxt}>Post Streak</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* ── Floating Action Button ── */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
                <LinearGradient
                    colors={['#7C3AED', '#EF4444']}
                    style={styles.fabGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="fire" size={26} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* ── Full-screen Streak Viewer ── */}
            <InlineStreakViewer
                visible={viewerUser !== null}
                user={viewerUser}
                onClose={() => setViewerUser(null)}
                onNext={nextViewer}
                onPrev={prevViewer}
            />

            {/* ── Create Streak Modal ── */}
            <CreateStreakModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={() => { setShowCreate(false); load(); }}
            />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconBtn: { padding: 6, borderRadius: 20 },
    headerTitle: { fontSize: 21, fontWeight: '800', letterSpacing: 0.2 },

    // Loading
    loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadTxt: { fontSize: 14, fontWeight: '500' },

    // Circles
    circlesSection: { paddingTop: 18, paddingBottom: 10 },
    circlesScroll: { paddingHorizontal: 10, gap: 0 },
    circleWrap: { width: 78, alignItems: 'center', marginHorizontal: 5, paddingBottom: 4 },
    circleGrad: {
        width: 70, height: 70, borderRadius: 35,
        padding: 2.5, alignItems: 'center', justifyContent: 'center',
    },
    circleInner: {
        width: 65, height: 65, borderRadius: 32.5,
        overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    },
    circleAddBg: { width: 65, height: 65, borderRadius: 32.5, overflow: 'hidden' },
    circleImg: { width: 65, height: 65, borderRadius: 32.5 },
    addOverlay: {
        position: 'absolute', bottom: 0, right: 0,
    },
    addBubble: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#7C3AED',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#FFF',
    },
    flameBadge: {
        position: 'absolute', top: 2, right: 4,
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1,
    },
    flameBadgeTxt: { fontSize: 9, color: '#FFF', fontWeight: '700' },
    circleLabel: { fontSize: 11, fontWeight: '600', marginTop: 5, textAlign: 'center', width: '100%' },

    // Quick reaction bar
    quickBar: {
        flexDirection: 'row', gap: 8,
        paddingHorizontal: 16, paddingBottom: 14,
    },
    quickBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 5, paddingVertical: 9, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    },
    quickBtnTxt: { fontSize: 12, fontWeight: '600' },

    // Search
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginBottom: 10,
        paddingHorizontal: 14, paddingVertical: 11,
        borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    },
    searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

    sectionLbl: {
        fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6,
        marginHorizontal: 16, marginBottom: 8,
    },

    // List card
    listPad: { paddingBottom: 100 },
    listCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginBottom: 10,
        padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    },
    listAvatarWrap: { marginRight: 12 },
    listGrad: {
        width: 58, height: 58, borderRadius: 29,
        padding: 2.5, alignItems: 'center', justifyContent: 'center',
    },
    listInner: { width: 53, height: 53, borderRadius: 26.5, overflow: 'hidden' },
    listAvatar: { width: 53, height: 53, borderRadius: 26.5 },
    listAvatarPlain: { width: 58, height: 58, borderRadius: 29, borderWidth: StyleSheet.hairlineWidth },
    listInfo: { flex: 1, gap: 3 },
    listName: { fontSize: 15, fontWeight: '700' },
    listMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listMetaTxt: { fontSize: 12, fontWeight: '500' },
    newPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    newPillTxt: { fontSize: 10, fontWeight: '800' },
    chatBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

    // Empty state
    emptyBox: { alignItems: 'center', paddingTop: 48, gap: 10, paddingHorizontal: 32 },
    emptyGrad: {
        width: 100, height: 100, borderRadius: 50,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { fontSize: 20, fontWeight: '800' },
    emptyDesc: { fontSize: 13, textAlign: 'center' },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22, marginTop: 8,
    },
    emptyBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    // FAB
    fab: {
        position: 'absolute', bottom: 28, right: 20,
        borderRadius: 30, elevation: 10,
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45, shadowRadius: 10,
    },
    fabGrad: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
    },

    // ── InlineStreakViewer ──
    viewerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
    viewerBgImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    viewerDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

    viewerSheet: { flex: 1 },
    viewerImgWrap: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    },
    viewerImg: { width: SCREEN_W, height: SCREEN_H },

    viewerTopBar: { position: 'absolute', top: 0, left: 0, right: 0 },
    progressRow: { marginHorizontal: 12, marginTop: 4 },
    progressBar: {
        height: 2.5, borderRadius: 2, flex: 1,
        marginBottom: 4,
    },

    viewerHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8,
        gap: 6,
    },
    viewerNavBtn: { padding: 4 },
    viewerUserRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    viewerAvatar: {
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 2, borderColor: '#FFF',
    },
    viewerName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    viewerStreakRow: { flexDirection: 'row', alignItems: 'center' },
    viewerStreakTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    closeBtn: { padding: 6 },

    actionsBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 14,
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    actionItem: { alignItems: 'center', marginRight: 20 },
    actionCount: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 2 },
    fireEmoji: { fontSize: 26, opacity: 0.7 },
    fireEmojiActive: { opacity: 1 },

    // Comments sheet
    commentSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        paddingHorizontal: 16, paddingTop: 10,
        maxHeight: SCREEN_H * 0.6,
    },
    commentHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: '#334155', alignSelf: 'center', marginBottom: 12,
    },
    commentHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
    },
    commentTitle: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
    commentItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        marginBottom: 14, gap: 10,
    },
    commentAvatar: { width: 34, height: 34, borderRadius: 17 },
    commentBody: { flex: 1 },
    commentUser: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginBottom: 2 },
    commentText: { color: '#F1F5F9', fontSize: 13 },
    commentTime: { color: '#475569', fontSize: 11 },
    commentInputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, marginTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1E293B',
    },
    commentInput: {
        flex: 1, backgroundColor: '#1E293B', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 9,
        color: '#F1F5F9', fontSize: 14,
    },
    sendBtn: { padding: 8 },
});
