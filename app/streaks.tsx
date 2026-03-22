import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';
import { streaksApi, type Streak } from '@/api/streaks';
import { useAuthStore } from '@/store/authStore';
import CreateStreakModal from '@/components/CreateStreak';
import StreakViewer from '@/components/StreakViewer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreakUser {
    user_id: number;
    display_name: string;
    username?: string;
    photo?: string;
    gender?: string;
    streak_count: number;
    last_updated?: string;
    last_uploader_id?: number;
    media?: { id: number; media_type?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatar(photo?: string, id?: number | string, gender?: string): string {
    if (photo && photo.startsWith('http')) return photo;
    return generateAvatarUrl(id || 'default', gender as any);
}

// ─── Story Circle Component ───────────────────────────────────────────────────

function StoryCircle({
    item,
    onPress,
    isMe = false,
    onAddPress,
}: {
    item: StreakUser | null;
    onPress?: (item: StreakUser) => void;
    isMe?: boolean;
    onAddPress?: () => void;
}) {
    const { colors, isDark } = useTheme();

    if (isMe) {
        return (
            <TouchableOpacity style={styles.circleWrapper} onPress={onAddPress}>
                <LinearGradient
                    colors={['#7C3AED', '#EF4444']}
                    style={styles.circleGradientBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={[styles.circleInner, { backgroundColor: colors.surface }]}>
                        <View style={styles.addIconCircle}>
                            <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
                        </View>
                    </View>
                </LinearGradient>
                <Text style={[styles.circleName, { color: colors.text }]} numberOfLines={1}>
                    Your Streak
                </Text>
            </TouchableOpacity>
        );
    }

    if (!item) return null;

    return (
        <TouchableOpacity style={styles.circleWrapper} onPress={() => item && onPress?.(item)}>
            <LinearGradient
                colors={['#FF6B35', '#EF4444', '#7C3AED']}
                style={styles.circleGradientBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={[styles.circleInner, { backgroundColor: colors.background }]}>
                    <Image
                        source={{ uri: getAvatar(item.photo, item.user_id, item.gender) }}
                        style={styles.circleAvatar}
                    />
                </View>
            </LinearGradient>
            <Text style={[styles.circleName, { color: colors.text }]} numberOfLines={1}>
                {(item.display_name || item.username || 'User').split(' ')[0]}
            </Text>
            {/* Streak count badge */}
            <View style={styles.circleBadge}>
                <Text style={styles.circleBadgeText}>🔥 {item.streak_count}</Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Reaction Bar ─────────────────────────────────────────────────────────────

function ReactionBar({ onReact }: { onReact: (type: string) => void }) {
    const { colors } = useTheme();
    const reactions = [
        { icon: 'heart', label: 'Like', color: '#EF4444' },
        { icon: 'fire', label: 'Fire', color: '#F97316' },
        { icon: 'comment-outline', label: 'Comment', color: colors.primary },
    ];

    return (
        <View style={styles.reactionBar}>
            {reactions.map((r) => (
                <TouchableOpacity
                    key={r.icon}
                    style={[styles.reactionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => onReact(r.label)}
                >
                    <MaterialCommunityIcons name={r.icon as any} size={18} color={r.color} />
                    <Text style={[styles.reactionLabel, { color: colors.textSecondary }]}>{r.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StreaksScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user: currentUser } = useAuthStore();

    const [streaks, setStreaks] = useState<StreakUser[]>([]);
    const [allStreaks, setAllStreaks] = useState<StreakUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewerUploadId, setViewerUploadId] = useState<number | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [friendsData, allData] = await Promise.all([
                streaksApi.getSnapchatStreaks('friends').catch(() => []),
                streaksApi.getSnapchatStreaks('all').catch(() => []),
            ]);
            setStreaks(Array.isArray(friendsData) ? friendsData : []);
            setAllStreaks(Array.isArray(allData) ? allData : []);
        } catch (e) {
            console.error('Failed to load streaks', e);
        } finally {
            setLoading(false);
        }
    };

    const openStreakViewer = (item: StreakUser) => {
        if (item.media?.id) {
            setViewerUploadId(item.media.id);
            setViewerVisible(true);
        } else {
            router.push(`/user/${item.user_id}` as any);
        }
    };

    const goToChat = (userId: number) => {
        // Chat screen at /chat/[id] takes a userId and creates the room itself
        router.push(`/chat/${userId}` as any);
    };

    const handleReact = (type: string) => {
        // Reaction feedback - would post to API in production
        console.log(`Reacted with: ${type}`);
    };

    // Filter list by search
    const filtered = searchQuery.trim()
        ? allStreaks.filter((u) =>
              (u.display_name || u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allStreaks;

    // ── Story circles data (friends who have active streaks with media) ──
    const circleUsers = streaks.slice(0, 12);

    // ── Render list item ──
    const renderListItem = ({ item }: { item: StreakUser }) => {
        return (
            <TouchableOpacity
                style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => openStreakViewer(item)}
                activeOpacity={0.85}
            >
                {/* Avatar with flame ring if has media */}
                <View style={styles.listAvatarWrap}>
                    {item.media ? (
                        <LinearGradient
                            colors={['#FF6B35', '#EF4444', '#7C3AED']}
                            style={styles.listAvatarGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={[styles.listAvatarInner, { backgroundColor: colors.background }]}>
                                <Image
                                    source={{ uri: getAvatar(item.photo, item.user_id, item.gender) }}
                                    style={styles.listAvatar}
                                />
                            </View>
                        </LinearGradient>
                    ) : (
                        <Image
                            source={{ uri: getAvatar(item.photo, item.user_id, item.gender) }}
                            style={[styles.listAvatarPlain, { borderColor: colors.border }]}
                        />
                    )}
                </View>

                {/* Name + streak info */}
                <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                        {item.display_name || item.username || 'User'}
                    </Text>
                    <View style={styles.listSubRow}>
                        <MaterialCommunityIcons name="fire" size={14} color="#EF4444" />
                        <Text style={[styles.listStreakNum, { color: colors.textSecondary }]}>
                            {item.streak_count} day streak
                        </Text>
                        {item.media && (
                            <View style={[styles.newBadge, { backgroundColor: colors.primaryLight }]}>
                                <Text style={[styles.newBadgeText, { color: colors.primary }]}>New</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Chat button */}
                <TouchableOpacity
                    style={[styles.chatBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={(e) => {
                        e.stopPropagation();
                        goToChat(item.user_id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="chat-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    // ── Main render ──
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Streaks 🔥</Text>
                <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                    <MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading streaks…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.user_id.toString()}
                    renderItem={renderListItem}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <>
                            {/* ── Circular Story Row ── */}
                            <View style={styles.storiesSection}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.storiesScroll}
                                >
                                    {/* First: "Your Streak" add button */}
                                    <StoryCircle isMe onAddPress={() => setShowCreate(true)} item={null} />

                                    {/* Friends' streak circles */}
                                    {circleUsers.map((item) => (
                                        <StoryCircle
                                            key={item.user_id}
                                            item={item}
                                            onPress={openStreakViewer}
                                        />
                                    ))}

                                    {circleUsers.length === 0 && (
                                        <View style={styles.emptyCircles}>
                                            <Text style={[styles.emptyCirclesText, { color: colors.textMuted }]}>
                                                No active streaks yet
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>

                            {/* ── Reaction Bar ── */}
                            <ReactionBar onReact={handleReact} />

                            {/* ── Search Bar ── */}
                            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Search streaks…"
                                    placeholderTextColor={colors.textMuted}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* ── List section header ── */}
                            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                                {searchQuery.trim() ? `Results for "${searchQuery}"` : 'All Streaks'}
                            </Text>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="fire-off" size={56} color={colors.textMuted} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No streaks found</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                                {searchQuery ? 'Try a different name' : 'Start a streak by sending one!'}
                            </Text>
                            {!searchQuery && (
                                <TouchableOpacity
                                    style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => setShowCreate(true)}
                                >
                                    <MaterialCommunityIcons name="fire" size={18} color="#FFF" />
                                    <Text style={styles.ctaBtnText}>Post a Streak</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* ── Floating Add Streak Button ── */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={['#7C3AED', '#EF4444']}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="fire" size={26} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* ── Create Streak Modal ── */}
            <CreateStreakModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={() => {
                    setShowCreate(false);
                    loadData();
                }}
            />

            {/* ── Streak Viewer ── */}
            <StreakViewer
                visible={viewerVisible}
                uploadId={viewerUploadId}
                onClose={() => {
                    setViewerVisible(false);
                    setViewerUploadId(null);
                }}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { padding: 4 },
    refreshBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },

    // Loading
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '500' },

    // Stories / circles
    storiesSection: { paddingVertical: 16 },
    storiesScroll: { paddingHorizontal: 12, gap: 4, alignItems: 'flex-start' },
    circleWrapper: {
        alignItems: 'center',
        marginHorizontal: 6,
        width: 72,
    },
    circleGradientBorder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        padding: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleInner: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleAvatar: { width: 65, height: 65, borderRadius: 32.5 },
    addIconCircle: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleName: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 5,
        textAlign: 'center',
        width: '100%',
    },
    circleBadge: {
        position: 'absolute',
        top: 54,
        right: 2,
        backgroundColor: '#020617',
        borderRadius: 8,
        paddingHorizontal: 3,
        paddingVertical: 1,
    },
    circleBadgeText: { fontSize: 9, color: '#FFF', fontWeight: '700' },
    emptyCircles: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 20,
        paddingVertical: 20,
    },
    emptyCirclesText: { fontSize: 13 },

    // Reaction bar
    reactionBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    reactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        flex: 1,
        justifyContent: 'center',
    },
    reactionLabel: { fontSize: 13, fontWeight: '600' },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginHorizontal: 16,
        marginBottom: 8,
        marginTop: 4,
    },

    // List
    listContent: { paddingBottom: 100 },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    listAvatarWrap: { marginRight: 12 },
    listAvatarGradient: {
        width: 58,
        height: 58,
        borderRadius: 29,
        padding: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listAvatarInner: {
        width: 53,
        height: 53,
        borderRadius: 26.5,
        overflow: 'hidden',
    },
    listAvatar: { width: 53, height: 53, borderRadius: 26.5 },
    listAvatarPlain: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: StyleSheet.hairlineWidth,
    },
    listInfo: { flex: 1, gap: 4 },
    listName: { fontSize: 15, fontWeight: '700' },
    listSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listStreakNum: { fontSize: 12, fontWeight: '500' },
    newBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: { fontSize: 10, fontWeight: '700' },

    chatBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
        gap: 8,
        paddingHorizontal: 32,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
    emptySubtitle: { fontSize: 13, textAlign: 'center' },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginTop: 12,
    },
    ctaBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 20,
        borderRadius: 30,
        elevation: 8,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
