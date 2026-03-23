import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    Modal,
    StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';
import { streaksApi } from '@/api/streaks';
import { CommentSheet } from './CommentSheet';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function avatar(photo?: string, id?: number | string, gender?: string): string {
    if (photo && photo.startsWith('http')) return photo;
    return generateAvatarUrl(id ?? 'default', gender as any);
}

export function StreakCircle({ item, isMe, onAddPress, onPress, profile }: any) {
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
    
    // Fix: Use profile photo for "Your Story"
    const displayPhoto = isMe ? (profile?.photo || item?.photo) : (item?.photo);
    const displayId = isMe ? 'me' : (item?.user_id || 'default');

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
                            source={{ uri: isMe && !item?.media ? avatar(displayPhoto, displayId) : (item?.media?.media_url || avatar(displayPhoto, displayId, item?.gender)) }} 
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
                {item && item.streak_count > 0 && (
                    <View style={styles.flameTopBadge}>
                        <Text style={styles.flameBadgeTxt}>🔥{item.streak_count}</Text>
                    </View>
                )}
                <Text style={[styles.circleLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export function InlineStreakViewer({ visible, user, onClose, onNext, onPrev }: any) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(60)).current;
    
    const [liked, setLiked] = useState(false);
    const [fired, setFired] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [fireCount, setFireCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const lastTapTime = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<Video>(null);
    const [isPaused, setIsPaused] = useState(false);

    const mediaList = user?.media_list || (user?.media ? [user.media] : []);
    const currentMedia = mediaList.length > 0 ? mediaList[currentIndex] : null;

    useEffect(() => {
        if (user) { 
            setCurrentIndex(0);
            const initialMedia = user.media_list?.[0] || user.media;
            setLiked(initialMedia?.has_liked ?? false); 
            setFired(initialMedia?.has_fired ?? false); 
            setLikeCount(initialMedia?.likes_count ?? 0); 
            setFireCount(user.streak_count ?? 0);
            setCommentCount(initialMedia?.comments_count ?? 0);
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

    const loadComments = async () => {
        if (!currentMedia?.id) return;
        setLoadingComments(true);
        try {
            const data = await streaksApi.listComments(currentMedia.id);
            setComments(data);
        } catch (error) {
            console.error('Failed to load streak comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async (text: string) => {
        if (!currentMedia?.id) return;
        try {
            await streaksApi.addComment(currentMedia.id, text);
            await loadComments();
            setCommentCount(c => c + 1);
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

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

        if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
            // Double tap - Like
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
                tapTimer.current = null;
            }
            handleLikeToggle();
            lastTapTime.current = 0;
            return;
        }
        
        lastTapTime.current = now;

        // Start a timer for single tap action
        tapTimer.current = setTimeout(() => {
            // NAVIGATION
            if (x < SCREEN_W * 0.3) {
                if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
                else onPrev?.();
            } else {
                if (currentIndex < mediaList.length - 1) setCurrentIndex(currentIndex + 1);
                else onNext?.();
            }
            tapTimer.current = null;
        }, DOUBLE_TAP_DELAY);
    };

    const handleLikeToggle = async () => {
        if (currentMedia?.id) {
            const res = await streaksApi.toggleLike(currentMedia.id);
            setLiked(res.liked);
            setLikeCount(c => res.liked ? c + 1 : c - 1);
        }
    };

    const handleFireToggle = async () => {
        if (currentMedia?.id) {
            const res = await streaksApi.toggleFire(currentMedia.id);
            setFired(res.fired);
            if (res.streak_count !== undefined) {
                setFireCount(res.streak_count);
            } else {
                setFireCount(c => res.fired ? c + 1 : c - 1);
            }
        } else if (user?.user_id) {
            const res = await streaksApi.toggleUserFire(user.user_id);
            setFired(res.fired);
            if (res.streak_count !== undefined) {
                setFireCount(res.streak_count);
            } else {
                setFireCount(c => res.fired ? c + 1 : c - 1);
            }
        }
    };

    if (!visible || !user) return null;
    const mediaUrl = currentMedia?.media_url ?? user.media?.media_url;
    const isVideo = currentMedia?.media_type === 'video';

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <View style={styles.viewerBg}>
                {mediaUrl && <Image source={{ uri: mediaUrl }} style={styles.viewerBgImg} blurRadius={18} />}
                <View style={styles.viewerDim} />
            </View>
            <Animated.View style={[styles.viewerSheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <TouchableOpacity activeOpacity={1} onPress={handleViewerPress} style={StyleSheet.absoluteFill}>
                    {isVideo ? (
                        <Video
                            ref={videoRef}
                            source={{ uri: mediaUrl }}
                            style={styles.viewerImg}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={!isPaused}
                            isLooping
                            useNativeControls={false}
                        />
                    ) : (
                        <Image source={{ uri: mediaUrl }} style={styles.viewerImg} resizeMode="cover" />
                    )}
                </TouchableOpacity>
                
                <SafeAreaView style={styles.viewerTopBar} edges={['top']}>
                    <View style={styles.viewerHeader}>
                        <View style={styles.authorInfo}>
                            <Image source={{ uri: avatar(user.photo, user.user_id) }} style={styles.authorAvatar} />
                            <View>
                                <Text style={styles.authorName}>{user.display_name || user.username}</Text>
                                <Text style={styles.mediaCount}>{currentIndex + 1} of {mediaList.length}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Media Pagination Indicators */}
                    {mediaList.length > 1 && (
                        <View style={styles.pagination}>
                            {mediaList.map((_: any, idx: number) => (
                                <View 
                                    key={idx} 
                                    style={[
                                        styles.paginationDot, 
                                        { backgroundColor: idx === currentIndex ? '#FFF' : 'rgba(255,255,255,0.4)', flex: 1 }
                                    ]} 
                                />
                            ))}
                        </View>
                    )}
                </SafeAreaView>

                {/* Footer Controls */}
                <View style={styles.viewerFooter}>
                    <View style={styles.footerActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleLikeToggle}>
                            <MaterialCommunityIcons name={liked ? "heart" : "heart-outline"} size={28} color={liked ? "#EF4444" : "#FFF"} />
                            <Text style={styles.actionCount}>{likeCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleFireToggle}>
                            <MaterialCommunityIcons name="fire" size={28} color={fired ? "#FF6B35" : "rgba(255,255,255,0.7)"} />
                            <Text style={styles.actionCount}>{fireCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setShowComments(true); loadComments(); }}>
                            <MaterialCommunityIcons name="comment-outline" size={26} color="#FFF" />
                            <Text style={styles.actionCount}>{commentCount}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Fire Animation Overlay (Optional, but user said "if double tap to like ... image slide ... fix that") */}
                {/* I already fixed that with tapTimer */}
            </Animated.View>
            <CommentSheet
                visible={showComments}
                onClose={() => setShowComments(false)}
                comments={comments.map(c => ({
                    id: c.id,
                    user_display_name: c.user?.display_name || c.user_display_name || 'User',
                    user_avatar: c.user?.photo || c.user_avatar,
                    text: c.text,
                    created_at: c.created_at
                }))}
                loading={loadingComments}
                onAddComment={handleAddComment}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    circleWrap: { alignItems: 'center', width: 78 },
    circleGrad: { width: 72, height: 72, borderRadius: 36, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
    circleInner: { width: 67, height: 67, borderRadius: 33.5, borderWidth: 1.5, borderColor: 'transparent', overflow: 'visible', position: 'relative' },
    circleImg: { width: '100%', height: '100%', borderRadius: 32 },
    circleLabel: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
    flameTopBadge: { position: 'absolute', top: -14, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
    flameBadgeTxt: { fontSize: 11, fontWeight: '900', color: '#EF4444' },
    addOverlay: { position: 'absolute', bottom: -2, right: -2 },
    addBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },

    viewerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
    viewerBgImg: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
    viewerDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    viewerSheet: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
    viewerImg: { ...StyleSheet.absoluteFillObject },
    viewerTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, zIndex: 10 },
    viewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    authorInfo: { flexDirection: 'row', alignItems: 'center' },
    authorAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10, borderWidth: 1.5, borderColor: '#FFF' },
    authorName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    mediaCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    closeBtn: { padding: 4 },
    pagination: { flexDirection: 'row', gap: 4, marginTop: 12, height: 2 },
    paginationDot: { height: 2, borderRadius: 1 },
    viewerFooter: { position: 'absolute', bottom: 40, left: 0, right: 0, paddingHorizontal: 20 },
    footerActions: { flexDirection: 'row', gap: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionCount: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
