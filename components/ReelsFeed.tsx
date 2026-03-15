import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reelsApi, Reel } from '@/api/reels';
import { profilesApi } from '@/api/profiles';
import { useFocusEffect } from '@react-navigation/native';
import { toast } from '@/utils/toast';
import { CommentSheet } from './CommentSheet';
import { ShareSheet } from './ShareSheet';
import { useIsFocused } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

const ReelItem = ({ item, isVisible, isFocused, onDelete }: { item: Reel, isVisible: boolean, isFocused: boolean, onDelete: (id: number) => void }) => {
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(isVisible);
    const [isMuted, setIsMuted] = useState(false);
    const [isLiked, setIsLiked] = useState(item.is_liked);
    const [likesCount, setLikesCount] = useState(item.likes_count);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false); // Should ideally come from API, but requirement says show Follow/Following toggle
    
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    
    const [showShare, setShowShare] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [key, setKey] = useState(0); // For retrying/re-mounting video

    useEffect(() => {
        // Enable audio mixing so user device is not completely hijacked
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
            // Optional: reset position if you want, but often pausing is enough for "no play" when away
            // videoRef.current?.setPositionAsync(0);
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
            // Refresh comments
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

    const handleDelete = () => {
        onDelete(item.id);
    };

    const handleRetry = () => {
        setError(null);
        setIsLoading(true);
        setKey(prev => prev + 1);
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
            <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={StyleSheet.absoluteFill}>
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
                        console.log(`[Reel ${item.id}] Starting load... URL: ${item.video_url}`);
                        setIsLoading(true);
                        setError(null);
                    }}
                    onLoad={(status) => {
                        console.log(`[Reel ${item.id}] Context: Loaded. Status:`, status);
                        setIsLoading(false);
                    }}
                    onError={(e) => {
                        console.error(`[Reel ${item.id}] Error:`, e);
                        setError(`Failed to load video: ${e}`);
                        setIsLoading(false);
                    }}
                    onReadyForDisplay={(event) => {
                        console.log(`[Reel ${item.id}] Ready for display. Layout:`, event.naturalSize);
                    }}
                />
            </TouchableOpacity>

            {isLoading && (
                <View style={[styles.playIconOverlay, { backgroundColor: '#000' }]}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={{ color: '#FFF', marginTop: 10 }}>Loading Reel...</Text>
                </View>
            )}

            {error && (
                <View style={[styles.playIconOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
                    <Text style={{ color: '#FFF', marginTop: 12, textAlign: 'center', paddingHorizontal: 20 }}>{error}</Text>
                    <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isPlaying && !isLoading && (
                <View style={styles.playIconOverlay}>
                    <MaterialCommunityIcons name="play" size={60} color="rgba(255,255,255,0.7)" />
                </View>
            )}

            {/* Interaction Buttons (Right) */}
            <View style={styles.rightActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                    <MaterialCommunityIcons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? "#EF4444" : "#FFF"} />
                    <Text style={styles.actionText}>{likesCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleOpenComments}>
                    <MaterialCommunityIcons name="comment-outline" size={32} color="#FFF" />
                    <Text style={styles.actionText}>{item.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShare(true)}>
                    <MaterialCommunityIcons name="send-outline" size={32} color="#FFF" style={{ transform: [{ rotate: '-45deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="dots-vertical" size={28} color="#FFF" />
                </TouchableOpacity>
                {item.is_owner && (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                        <MaterialCommunityIcons name="delete-outline" size={28} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Bottom info section */}
            <View style={styles.bottomInfo}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.user_avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                    <Text style={styles.username}>{item.user_display_name}</Text>
                    <TouchableOpacity 
                        style={[styles.followBtn, isFollowing && { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
                        onPress={handleFollow}
                    >
                        <Text style={styles.followTxt}>{isFollowing ? 'Following' : 'Follow'}</Text>
                    </TouchableOpacity>
                </View>
                {item.caption ? (
                    <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
                ) : null}
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

export default function ReelsFeed() {
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused();
    const [activeViewableItemIndex, setActiveViewableItemIndex] = useState(0);
    const [flatListHeight, setFlatListHeight] = useState(height);

    useFocusEffect(
        useCallback(() => {
            fetchReels();
        }, [])
    );

    const fetchReels = async () => {
        try {
            const data = await reelsApi.getReels();
            console.log(`[Reels] Fetched ${data.length} reels. First reel URL:`, data[0]?.video_url);
            setReels(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReel = async (id: number) => {
        try {
            await reelsApi.deleteReel(id);
            toast.success("Reel deleted");
            setReels(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            toast.error("Failed to delete reel");
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveViewableItemIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#FFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={reels}
                renderItem={({ item, index }) => (
                    <View style={{ height: flatListHeight }}>
                        <ReelItem 
                            item={item} 
                            isVisible={activeViewableItemIndex === index} 
                            isFocused={isFocused}
                            onDelete={handleDeleteReel}
                        />
                    </View>
                )}
                keyExtractor={(item, index) => item?.id?.toString() ?? `reel-${index}`}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onLayout={(e) => setFlatListHeight(e.nativeEvent.layout.height)}
                decelerationRate="fast"
                snapToInterval={flatListHeight}
                snapToAlignment="start"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
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
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    caption: {
        color: '#FFF',
        fontSize: 14,
        marginBottom: 12,
    },
    retryBtn: {
        marginTop: 20,
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    }
});
