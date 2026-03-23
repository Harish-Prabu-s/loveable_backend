import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
    KeyboardAvoidingView, Platform, FlatList, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { storiesApi } from '@/api/stories';
import { notificationsApi } from '@/api/notifications';
import { useAuthStore } from '@/store/authStore';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import * as ScreenCapture from 'expo-screen-capture';

export default function StoryViewScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const storyId = Number(id);
    const { user } = useAuthStore();

    const [story, setStory] = useState<any>(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [comments, setComments] = useState<any[]>([]);
    const [viewers, setViewers] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const heartScale = useRef(new Animated.Value(1)).current;

    // Prevent screen recording and detect screenshots
    useEffect(() => {
        ScreenCapture.preventScreenCaptureAsync();
        const subscription = ScreenCapture.addScreenshotListener(() => {
            if (story && story.user !== user?.id) {
                notificationsApi.notifyScreenshot(story.user, 'story', storyId);
            }
        });

        return () => {
            ScreenCapture.allowScreenCaptureAsync();
            subscription.remove();
        };
    }, [story, storyId]);

    const loadViewers = async () => {
        try {
            const data = await storiesApi.getViews(storyId);
            setViewers(data || []);
            setShowViewers(true);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const found = await storiesApi.getStory(storyId);
                if (found) {
                    setStory(found);
                    setLiked(found.is_liked || false);
                    setLikeCount(found.likes_count || 0);
                }
                await storiesApi.view(storyId);
                const commentsData = await storiesApi.getComments(storyId);
                setComments(commentsData);
            } catch (e) {
                console.error('Failed to load story detail:', e);
            }
        };
        load();
    }, [storyId]);

    const handleLike = async () => {
        const previousLiked = liked;
        const previousCount = likeCount;

        // Optimistic UI
        setLiked(!previousLiked);
        setLikeCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);

        try {
            const res = await storiesApi.like(storyId);
            setLiked(res.liked);
            setLikeCount(res.likes_count);

            if (res.liked) {
                Animated.sequence([
                    Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true }),
                    Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
                ]).start();
            }
        } catch (e) {
            setLiked(previousLiked);
            setLikeCount(previousCount);
        }
    };

    const handleSendComment = async () => {
        if (!commentText.trim()) return;
        try {
            const comment = await storiesApi.addComment(storyId, commentText.trim());
            setComments(prev => [...prev, comment]);
            setCommentText('');
        } catch (e: any) {
            if (e.response?.status === 403) {
                Alert.alert('Comments restricted', 'You can only comment if you both follow each other.');
            }
        }
    };

    const handleDeleteStory = () => {
        Alert.alert(
            'Delete Story',
            'Are you sure you want to delete this story?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await storiesApi.deleteStory(storyId);
                            router.back();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete story');
                        }
                    }
                }
            ]
        );
    };

    if (!story) {
        return (
            <View style={styles.loading}>
                <MaterialCommunityIcons name="image" size={60} color="#334155" />
                <Text style={{ color: '#475569', marginTop: 12 }}>Loading story...</Text>
            </View>
        );
    }

    const authorDisplayName = story.user_display_name || 'User';
    const authorAvatar = story.user_avatar ? getMediaUrl(story.user_avatar) : generateAvatarUrl(story.user || 0, 'O');

    return (
        <View style={styles.container}>
            {/* Full-screen story image */}
            <Image source={{ uri: getMediaUrl(story.media_url) }} style={styles.storyImage} resizeMode="cover" />

            {/* Gradient overlays */}
            <View style={styles.topGradient} />
            <View style={styles.bottomGradient} />

            {/* Top bar */}
            <SafeAreaView style={styles.topBar}>
                <View style={styles.authorRow}>
                    <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
                    <Text style={styles.authorName}>{authorDisplayName}</Text>
                    <Text style={styles.storyTime}>
                        · {story.created_at ? new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
            </SafeAreaView>
            
            {/* Caption Overlay */}
            {story.caption ? (
                <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>{story.caption}</Text>
                </View>
            ) : null}

            {/* Right action buttons */}
            <View style={styles.rightActions}>
                <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                        <MaterialCommunityIcons
                            name={liked ? 'heart' : 'heart-outline'}
                            size={30}
                            color={liked ? '#EF4444' : '#FFF'}
                        />
                    </Animated.View>
                    <Text style={styles.actionCount}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowComments(v => !v)} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="comment-outline" size={30} color="#FFF" />
                    <Text style={styles.actionCount}>{comments.length}</Text>
                </TouchableOpacity>

                {story.user === user?.id && (
                    <>
                        <TouchableOpacity onPress={loadViewers} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="eye-outline" size={30} color="#FFF" />
                            <Text style={styles.actionCount}>{story.view_count || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDeleteStory} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="delete-outline" size={30} color="#EF4444" />
                            <Text style={[styles.actionCount, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Comments panel */}
            {showComments && (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.commentsPanel}>
                    <FlatList
                        data={comments}
                        keyExtractor={c => String(c.id)}
                        renderItem={({ item }) => (
                            <View style={styles.commentRow}>
                                <Text style={styles.commentUser}>{item.user?.display_name}: </Text>
                                <Text style={styles.commentText}>{item.text}</Text>
                            </View>
                        )}
                        style={{ maxHeight: 200 }}
                    />
                    <View style={styles.commentInput}>
                        <TextInput
                            style={styles.commentInputField}
                            placeholder="Add a comment..."
                            placeholderTextColor="#64748B"
                            value={commentText}
                            onChangeText={setCommentText}
                            onSubmitEditing={handleSendComment}
                        />
                        <TouchableOpacity onPress={handleSendComment}>
                            <MaterialCommunityIcons name="send" size={22} color="#8B5CF6" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* Viewers panel */}
            {showViewers && (
                <View style={styles.commentsPanel}>
                    <Text style={styles.viewerTitle}>Viewers ({viewers.length})</Text>
                    {viewers.map((v: any) => (
                        <View key={v.id} style={styles.commentRow}>
                            <Text style={styles.commentUser}>{v.viewer_profile?.display_name || 'User'}</Text>
                        </View>
                    ))}
                    <TouchableOpacity onPress={() => setShowViewers(false)} style={{ padding: 8 }}>
                        <Text style={{ color: '#8B5CF6' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loading: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' },
    storyImage: { ...StyleSheet.absoluteFillObject },
    topGradient: { ...StyleSheet.absoluteFillObject, height: 200, backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomGradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12,
    },
    authorRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    authorAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FFF', marginRight: 10 },
    authorName: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    storyTime: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginLeft: 4 },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    },
    rightActions: {
        position: 'absolute', right: 16, bottom: 120,
        alignItems: 'center', gap: 20,
    },
    actionBtn: { alignItems: 'center' },
    actionCount: { color: '#FFF', fontSize: 12, marginTop: 4, fontWeight: '600' },
    commentsPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(2,6,23,0.95)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 16, paddingBottom: 30,
    },
    commentRow: { flexDirection: 'row', marginBottom: 8 },
    commentUser: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
    commentText: { color: '#E2E8F0', fontSize: 13, flex: 1 },
    commentInput: {
        flexDirection: 'row', alignItems: 'center', marginTop: 12,
        backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
        borderWidth: 1, borderColor: '#1E293B',
    },
    commentInputField: { flex: 1, color: '#F1F5F9', fontSize: 14, marginRight: 10 },
    viewerTitle: { color: '#F1F5F9', fontWeight: '700', fontSize: 16, marginBottom: 12 },
    captionContainer: {
        position: 'absolute', bottom: 100, left: 16, right: 80,
        backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12,
    },
    captionText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
});
