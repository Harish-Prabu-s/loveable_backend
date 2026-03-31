import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { storiesApi } from '@/api/stories';
import { notificationsApi } from '@/api/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import { ensureHttps } from '@/utils/url';

const { width, height } = Dimensions.get('window');

export default function StoryViewer({ visible, story, onClose, onNext, onPrev, onDelete }) {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLiked, setIsLiked] = useState(story?.is_liked || false);
    const [likesCount, setLikesCount] = useState(story?.likes_count || 0);
    const lastTap = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);

    // Prevent screen recording and detect screenshots
    useEffect(() => {
        let subscription: any;
        if (visible) {
            ScreenCapture.preventScreenCaptureAsync();
            subscription = ScreenCapture.addScreenshotListener(() => {
                if (story && !story.is_owner) {
                    notificationsApi.notifyScreenshot(story.user, 'story', story.id);
                }
            });
        }
        
        return () => {
            if (visible) {
                ScreenCapture.allowScreenCaptureAsync();
            }
            if (subscription) {
                subscription.remove();
            }
        };
    }, [visible, story]);

    const handleLike = async () => {
        if (story) {
            try {
                const res = await storiesApi.like(story.id);
                setIsLiked(res.liked);
                setLikesCount(res.likes_count);
            } catch (e) {
                console.error("Failed to like story", e);
            }
        }
    };

    useEffect(() => {
        let timer: any;
        if (visible && story) {
            setProgress(0);
            // Record view
            storiesApi.viewStory(story.id).catch(() => { });
            setIsLiked(story.is_liked || false);
            setLikesCount(story.likes_count || 0);

            timer = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 1) {
                        clearInterval(timer);
                        if (onNext) onNext();
                        else onClose();
                        return 1;
                    }
                    return prev + 0.05; // 5% every 250ms -> 5 seconds total
                });
            }, 250);
        }
        return () => clearInterval(timer);
    }, [visible, story]);

    if (!visible || !story) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                <SafeAreaView style={styles.safeArea}>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Image source={{ uri: ensureHttps(story.user_avatar) as string }} style={styles.avatar} />
                            <Text style={styles.username}>{story.user_display_name}</Text>
                            <Text style={styles.timeText}>2h</Text>
                        </View>
                        <View style={styles.headerRight}>
                            {story.is_owner && (
                                <TouchableOpacity 
                                    onPress={() => {
                                        Alert.alert(
                                            "Delete Story",
                                            "Are you sure you want to delete this story?",
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                { 
                                                    text: "Delete", 
                                                    style: "destructive",
                                                    onPress: async () => {
                                                        setIsDeleting(true);
                                                        await onDelete(story.id);
                                                        setIsDeleting(false);
                                                    }
                                                }
                                            ]
                                        );
                                    }} 
                                    style={styles.headerBtn}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Controls Overlay */}
                    <View style={styles.controlsOverlay}>
                        <TouchableOpacity 
                            activeOpacity={1} 
                            style={styles.leftControl} 
                            onPress={() => {
                                const now = Date.now();
                                if (now - lastTap.current < 300) {
                                    if (tapTimer.current) clearTimeout(tapTimer.current);
                                    if (!isLiked) handleLike();
                                    lastTap.current = 0;
                                } else {
                                    lastTap.current = now;
                                    tapTimer.current = setTimeout(() => {
                                        onPrev();
                                        tapTimer.current = null;
                                    }, 300);
                                }
                            }} 
                        />
                        <TouchableOpacity 
                            activeOpacity={1} 
                            style={styles.rightControl} 
                            onPress={() => {
                                const now = Date.now();
                                if (now - lastTap.current < 300) {
                                    if (tapTimer.current) clearTimeout(tapTimer.current);
                                    if (!isLiked) handleLike();
                                    lastTap.current = 0;
                                } else {
                                    lastTap.current = now;
                                    tapTimer.current = setTimeout(() => {
                                        onNext();
                                        tapTimer.current = null;
                                    }, 300);
                                }
                            }} 
                        />
                    </View>

                    {/* Media */}
                    <Image
                        source={{ uri: ensureHttps(story.media_url) as string }}
                        style={styles.media}
                        resizeMode="cover"
                    />

                    {/* Viewer Count Overlay (If own story) */}
                    <View style={styles.footer}>
                        <MaterialCommunityIcons name="eye" size={20} color="#FFF" />
                        <Text style={styles.viewCount}>{story.view_count || 0}</Text>
                        <View style={{ width: 12 }} />
                        <MaterialCommunityIcons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#EF4444' : '#FFF'} />
                        <Text style={styles.viewCount}>{likesCount}</Text>
                    </View>

                    {/* Caption & Mentions */}
                    <View style={styles.storyContent}>
                        {story.caption ? <Text style={styles.storyCaption}>{story.caption}</Text> : null}
                        {story.mentioned_users && story.mentioned_users.length > 0 && (
                            <View style={styles.mentionsContainer}>
                                {story.mentioned_users.map(u => (
                                    <TouchableOpacity 
                                        key={u.id} 
                                        style={styles.mentionChip}
                                        onPress={() => {
                                            onClose();
                                            router.push(`/user/${u.id}` as any);
                                        }}
                                    >
                                        <Text style={styles.mentionText}>@{u.username}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
        position: 'relative',
    },
    progressContainer: {
        position: 'absolute',
        top: 50,
        left: 10,
        right: 10,
        height: 3,
        zIndex: 10,
        flexDirection: 'row',
    },
    progressTrack: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginHorizontal: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFF',
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    username: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
    },
    timeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBtn: {
        padding: 8,
        marginLeft: 8,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        zIndex: 5,
    },
    leftControl: {
        flex: 1,
    },
    rightControl: {
        flex: 1,
    },
    media: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    viewCount: {
        color: '#FFF',
        marginLeft: 6,
        fontWeight: 'bold',
    },
    storyContent: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    storyCaption: {
        color: '#FFF',
        fontSize: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        marginBottom: 10,
    },
    mentionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    mentionChip: {
        backgroundColor: 'rgba(139, 92, 246, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.6)',
    },
    mentionText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    }
});
