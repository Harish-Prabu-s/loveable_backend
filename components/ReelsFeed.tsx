import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reelsApi, Reel } from '@/api/reels';
import { profilesApi } from '@/api/profiles';
import { useFocusEffect } from '@react-navigation/native';
import { toast } from '@/utils/toast';
import { CommentSheet } from './CommentSheet';
import { ShareSheet } from './ShareSheet';
import { archiveApi } from '@/api/archive';
import { useIsFocused } from '@react-navigation/native';

const { height: windowHeight } = Dimensions.get('window');
import { ReelItem } from './ReelItem';

export default function ReelsFeed() {
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    const isFocused = useIsFocused();
    const [activeViewableItemIndex, setActiveViewableItemIndex] = useState(0);
    const [flatListHeight, setFlatListHeight] = useState(windowHeight);

    useFocusEffect(
        useCallback(() => {
            fetchReels(1, true);
        }, [])
    );

    const fetchReels = async (pageNum = 1, isInitial = false) => {
        if (!hasMore && !isInitial) return;
        if (loadingMore) return;

        try {
            if (isInitial) setLoading(true);
            else setLoadingMore(true);

            // Fetch 10 items. Page 1 requests random order.
            const data = await reelsApi.getReels(pageNum, 10, isInitial);
            
            if (data.length < 10) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (isInitial) {
                setReels(data);
                setPage(1);
            } else {
                setReels(prev => {
                    // Filter duplicates to strict guarantee no dups
                    const existingIds = new Set(prev.map(r => r.id));
                    const newReels = data.filter(r => !existingIds.has(r.id));
                    return [...prev, ...newReels];
                });
                setPage(pageNum);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load reels");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading && !loadingMore && hasMore) {
            fetchReels(page + 1, false);
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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={{ color: '#FFF', marginTop: 10, fontWeight: '600' }}>Loading Reels...</Text>
            </View>
        );
    }
    
    if (reels.length === 0 && !loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <MaterialCommunityIcons name="movie-play-outline" size={64} color="#64748B" />
                <Text style={{ color: '#FFF', marginTop: 16, fontSize: 18, fontWeight: 'bold' }}>No Reels Available</Text>
                <Text style={{ color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>We couldn't find any reels to show right now.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReels(1, true)}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Refresh</Text>
                </TouchableOpacity>
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
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#8B5CF6" />
                        </View>
                    ) : null
                }
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
