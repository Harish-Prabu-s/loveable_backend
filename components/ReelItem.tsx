import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useTheme } from '@/context/ThemeContext';
import { Video, ResizeMode, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatePresence } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reelsApi, Reel } from '@/api/reels';
import { profilesApi } from '@/api/profiles';
import { toast } from '@/utils/toast';
import { CommentSheet } from './CommentSheet';
import { ShareSheet } from './ShareSheet';
import { archiveApi } from '@/api/archive';

const { height, width } = Dimensions.get('window');

export const ReelItem = ({ item, isVisible, isFocused, onDelete }: { item: Reel, isVisible: boolean, isFocused: boolean, onDelete: (id: number) => void }) => {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(isVisible);
    const [isMuted, setIsMuted] = useState(false);
    const [isLiked, setIsLiked] = useState(item.is_liked);
    const [likesCount, setLikesCount] = useState(item.likes_count);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    
    const [showShare, setShowShare] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [key, setKey] = useState(0);
    const [showHeart, setShowHeart] = useState(false);
    const lastTap = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
        }).catch(e => console.log('Audio init error:', e));
    }, []);

    useEffect(() => {
        if (isVisible && isFocused) {
            setIsPlaying(true);
            videoRef.current?.playAsync();
        } else {
            setIsPlaying(false);
            videoRef.current?.pauseAsync();
        }
    }, [isVisible, isFocused]);

    const handleLike = async () => {
        const previousState = isLiked;
        const previousCount = likesCount;
        setIsLiked(!previousState);
        setLikesCount(previousState ? Math.max(0, previousCount - 1) : previousCount + 1);
        try {
            const res = await reelsApi.likeReel(item.id);
            setIsLiked(res.liked);
            setLikesCount(res.likes_count);
        } catch (e) {
            setIsLiked(previousState);
            setLikesCount(previousCount);
            toast.error("Failed to like reel");
        }
    };

    const handleFollow = async () => {
        const prev = isFollowing;
        setIsFollowing(!prev);
        try {
            if (prev) {
                await profilesApi.unfollow(item.user);
                toast.success("Unfollowed");
            } else {
                await profilesApi.follow(item.user);
                toast.success("Following");
            }
        } catch (e) {
            setIsFollowing(prev);
            toast.error("Failed to update follow status");
        }
    };

    const handleOpenComments = async () => {
        setShowComments(true);
        setCommentsLoading(true);
        try {
            const data = await reelsApi.getComments(item.id);
            setComments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleAddComment = async (text: string) => {
        try {
            await reelsApi.commentReel(item.id, text);
            const data = await reelsApi.getComments(item.id);
            setComments(data);
        } catch (e) {
            toast.error("Failed to post comment");
        }
    };

    const handleShare = async (targetUserId: number) => {
        await reelsApi.shareReel(item.id, targetUserId);
        toast.success("Shared to chat");
        setShowShare(false);
    };

    const confirmArchive = () => {
        Alert.alert(
            "Archive Reel",
            "This reel will be moved to your archive.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Archive", onPress: async () => {
                    try {
                        await archiveApi.archive('reel', item.id);
                        toast.success("Reel archived");
                        onDelete(item.id);
                    } catch (e) {
                        toast.error("Failed to archive reel");
                    }
                }}
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Reel",
            "Are you sure you want to delete this reel? This is permanent.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) }
            ]
        );
    };

    const handleMenuPress = () => {
        Alert.alert(
            "Reel Options",
            undefined,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Archive", onPress: confirmArchive },
                { text: "Delete", style: "destructive", onPress: handleDelete }
            ]
        );
    };

    const handleRetry = () => {
        setError(null);
        setIsLoading(true);
        setKey(prev => prev + 1);
    };

    const handleVideoPress = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
                tapTimer.current = null;
            }
            if (!isLiked) handleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
            lastTap.current = 0;
            return;
        }
        lastTap.current = now;
        tapTimer.current = setTimeout(() => {
            togglePlayPause();
            tapTimer.current = null;
        }, DOUBLE_TAP_DELAY);
    };

    const togglePlayPause = () => {
        if (isPlaying) {
            videoRef.current?.pauseAsync();
            setIsPlaying(false);
        } else {
            videoRef.current?.playAsync();
            setIsPlaying(true);
        }
    };

    return (
        <View style={styles.reelContainer}>
            <TouchableOpacity activeOpacity={1} onPress={handleVideoPress} style={StyleSheet.absoluteFill}>
                <Video
                    key={key}
                    ref={videoRef}
                    source={{ uri: item.video_url }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    isMuted={isMuted}
                    shouldPlay={isVisible && isFocused && isPlaying}
                    onLoadStart={() => {
                        setIsLoading(true);
                        setError(null);
                    }}
                    onLoad={() => {
                        setIsLoading(false);
                    }}
                    onError={(e) => {
                        setError(`Failed to load video: ${e}`);
                        setIsLoading(false);
                    }}
                />
                <AnimatePresence>
                    {showHeart && (
                        <MotiView
                            from={{ scale: 0, opacity: 0, rotate: '-20deg' }}
                            animate={{ scale: 2, opacity: 1, rotate: '0deg' }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                                type: 'spring',
                                damping: 10,
                                stiffness: 200,
                            }}
                            style={styles.heartOverlay}
                        >
                            <LinearGradient
                                colors={[colors.danger, colors.accent]}
                                style={styles.heartGradient}
                            >
                                <MaterialCommunityIcons name="heart" size={70} color="#FFFFFF" />
                            </LinearGradient>
                        </MotiView>
                    )}
                </AnimatePresence>
            </TouchableOpacity>

            {isLoading && (
                <View style={[styles.playIconOverlay, { backgroundColor: '#000000' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {error && (
                <View style={[styles.playIconOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
                    <TouchableOpacity onPress={handleRetry} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isPlaying && !isLoading && (
                <View style={styles.playIconOverlay} pointerEvents="none">
                    <MaterialCommunityIcons name="play" size={60} color="rgba(255,255,255,0.7)" />
                </View>
            )}

            <View style={styles.rightActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={togglePlayPause}>
                    <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={32} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                    <MaterialCommunityIcons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? colors.danger : "#FFFFFF"} />
                    <Text style={[styles.actionText, { color: '#FFFFFF' }]}>{likesCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleOpenComments}>
                    <MaterialCommunityIcons name="comment-outline" size={32} color="#FFFFFF" />
                    <Text style={[styles.actionText, { color: '#FFFFFF' }]}>{item.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShare(true)}>
                    <MaterialCommunityIcons name="send-outline" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '-45deg' }] }} />
                </TouchableOpacity>
                {item.is_owner && (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleMenuPress}>
                        <MaterialCommunityIcons name="dots-vertical" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.bottomInfo}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.user_avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                    <Text style={[styles.username, { color: '#FFFFFF' }]}>{item.user_display_name}</Text>
                    <TouchableOpacity 
                        style={[styles.followBtn, isFollowing && { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
                        onPress={handleFollow}
                    >
                        <Text style={styles.followTxt}>{isFollowing ? 'Following' : 'Follow'}</Text>
                    </TouchableOpacity>
                </View>
                {item.caption ? (
                    <Text style={[styles.caption, { color: '#FFFFFF' }]} numberOfLines={2}>{item.caption}</Text>
                ) : null}
                {item.mentioned_users && item.mentioned_users.length > 0 && (
                    <View style={styles.mentionsRow}>
                        {item.mentioned_users.map(u => (
                            <TouchableOpacity 
                                key={u.id} 
                                style={styles.mentionChip}
                                onPress={() => router.push(`/user/${u.id}` as any)}
                            >
                                <Text style={styles.mentionText}>@{u.username}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <CommentSheet 
                visible={showComments} 
                onClose={() => setShowComments(false)}
                comments={comments}
                loading={commentsLoading}
                onAddComment={handleAddComment}
            />

            <ShareSheet 
                visible={showShare}
                onClose={() => setShowShare(false)}
                onShare={handleShare}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    reelContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    playIconOverlay: {
        position: 'absolute',
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    rightActions: {
        position: 'absolute',
        bottom: 120,
        right: 16,
        alignItems: 'center',
        zIndex: 10,
    },
    actionBtn: {
        alignItems: 'center',
        marginBottom: 20,
    },
    actionText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    bottomInfo: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 80,
        zIndex: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    username: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
        marginRight: 12,
    },
    followBtn: {
        borderWidth: 1,
        borderColor: '#FFF',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    followTxt: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    caption: {
        fontSize: 14,
        marginBottom: 12,
    },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    heartOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -55,
        marginLeft: -55,
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartGradient: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 15,
    },
    mentionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: -4,
        marginBottom: 8,
    },
    mentionChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    mentionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
