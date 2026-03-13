import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reelsApi, Reel } from '@/api/reels';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { toast } from '@/utils/toast';

const { height, width } = Dimensions.get('window');

const ReelItem = ({ item, isVisible }: { item: Reel, isVisible: boolean }) => {
    const videoRef = useRef<Video>(null);
    const [isPlaying, setIsPlaying] = useState(isVisible);
    const [isMuted, setIsMuted] = useState(false);
    const [isLiked, setIsLiked] = useState(item.is_liked);
    const [likesCount, setLikesCount] = useState(item.likes_count);

    useEffect(() => {
        // ... (keep audio mixing code)
    }, []);

    const handleLike = async () => {
        const previousState = isLiked;
        const previousCount = likesCount;

        // Optimistic UI
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

    useEffect(() => {
        // Enable audio mixing so user device is not completely hijacked
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
        }).catch(e => console.log('Audio init error:', e));

        if (isVisible) {
            setIsPlaying(true);
            videoRef.current?.playAsync();
        } else {
            setIsPlaying(false);
            videoRef.current?.pauseAsync();
            videoRef.current?.setPositionAsync(0);
        }
    }, [isVisible]);

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
                    ref={videoRef}
                    source={{ uri: item.video_url }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    isMuted={isMuted}
                    shouldPlay={isVisible}
                />
            </TouchableOpacity>

            {/* Play indicator */}
            {!isPlaying && (
                <View style={styles.playIconOverlay}>
                    <MaterialCommunityIcons name="play" size={60} color="rgba(255,255,255,0.7)" />
                </View>
            )}

            {/* Header (Top) */}
            <View style={styles.header}>
                <Text style={styles.reelsTitle}>Reels</Text>
                <TouchableOpacity style={styles.cameraBtn}>
                    <MaterialCommunityIcons name="camera-outline" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Interaction Buttons (Right) */}
            <View style={styles.rightActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                    <MaterialCommunityIcons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? "#EF4444" : "#FFF"} />
                    <Text style={styles.actionText}>{likesCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="comment-outline" size={32} color="#FFF" />
                    <Text style={styles.actionText}>{item.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="send-outline" size={32} color="#FFF" style={{ transform: [{ rotate: '-45deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="dots-vertical" size={28} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.musicThumb}>
                    <MaterialCommunityIcons name="music" size={16} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Bottom info section */}
            <View style={styles.bottomInfo}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.user_avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                    <Text style={styles.username}>{item.user_display_name}</Text>
                    <TouchableOpacity style={styles.followBtn}>
                        <Text style={styles.followTxt}>Follow</Text>
                    </TouchableOpacity>
                </View>
                {item.caption ? (
                    <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
                ) : null}
                <View style={styles.musicInfo}>
                    <MaterialCommunityIcons name="music-note" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.musicText}>Original Audio</Text>
                </View>
            </View>

        </View>
    );
};

export default function ReelsFeed() {
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeViewableItemIndex, setActiveViewableItemIndex] = useState(0);

    // Calculate item height - using a hook to get tab bar height might be better if used in tabs
    // Assuming a standard tab bar height of 49 or 84 (with safe area)
    // We'll adjust the height dynamically based on the FlatList's layout
    const [flatListHeight, setFlatListHeight] = useState(height);

    useEffect(() => {
        fetchReels();
    }, []);

    const fetchReels = async () => {
        try {
            const data = await reelsApi.getReels();
            setReels(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveViewableItemIndex(viewableItems[0].index);
        }
    });

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    });

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
                        <ReelItem item={item} isVisible={activeViewableItemIndex === index} />
                    </View>
                )}
                keyExtractor={(item, index) => item?.id?.toString() ?? `reel-${index}`}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged.current}
                viewabilityConfig={viewabilityConfig.current}
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
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    reelsTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    cameraBtn: {
        padding: 8,
    },
    rightActions: {
        position: 'absolute',
        bottom: 120,
        right: 16,
        alignItems: 'center',
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
    musicThumb: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    bottomInfo: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 80, // leave space for right actions
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
    musicInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    musicText: {
        color: '#FFF',
        fontSize: 12,
    }
});
