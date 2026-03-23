import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { postsApi, Post } from '@/api/posts';
import { archiveApi } from '@/api/archive';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { toast } from '@/utils/toast';
import { CommentSheet } from './CommentSheet';
import { ShareSheet } from './ShareSheet';
import { DeviceEventEmitter } from 'react-native';

function getAvatarUri(photo: string | null | undefined, seed: string | number, gender?: string): string {
    const resolved = getMediaUrl(photo);
    if (resolved) return resolved;
    return generateAvatarUrl(seed, gender as any);
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function PostCard({ post, onLike }: { post: Post; onLike: (id: number) => void }) {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;
    const lastTap = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);
    
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    
    const [showShare, setShowShare] = useState(false);

    const handleLike = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        onLike(post.id);
    };

    const handleOpenComments = async () => {
        setShowComments(true);
        setCommentsLoading(true);
        try {
            const data = await postsApi.getComments(post.id);
            setComments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleAddComment = async (text: string) => {
        try {
            await postsApi.addComment(post.id, text);
            const data = await postsApi.getComments(post.id);
            setComments(data);
        } catch (e) {
            toast.error("Failed to post comment");
        }
    };

    const handleShare = async (targetUserId: number) => {
        await postsApi.sharePost(post.id, targetUserId);
        setShowShare(false);
    };

    const handleArchive = async () => {
        Alert.alert(
            "Archive Post",
            "This post will be moved to your archive and hidden from others.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Archive", 
                    onPress: async () => {
                        try {
                            await archiveApi.archive('post', post.id);
                            toast.success("Post archived");
                            DeviceEventEmitter.emit('posts:changed');
                        } catch (e) {
                            toast.error("Failed to archive post");
                        }
                    } 
                }
            ]
        );
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post permanently?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await archiveApi.delete('post', post.id);
                            toast.success("Post deleted");
                            DeviceEventEmitter.emit('posts:changed');
                        } catch (e) {
                            toast.error("Failed to delete post");
                        }
                    } 
                }
            ]
        );
    };

    const handleMenuPress = () => {
        Alert.alert(
            "Post Options",
            undefined,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Archive", onPress: handleArchive },
                { text: "Delete", style: "destructive", onPress: handleDelete }
            ]
        );
    };

    return (
        <View style={[postStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={postStyles.postHeader}>
                <TouchableOpacity
                    style={postStyles.authorRow}
                    onPress={() => router.push(`/user/${post.user}` as any)}
                >
                    <Image
                        source={{ uri: getAvatarUri(post.photo, post.user, post.gender) }}
                        style={postStyles.avatar}
                    />
                    <View>
                        <Text style={[postStyles.authorName, { color: colors.text }]}>{post.display_name || 'User'}</Text>
                        <Text style={[postStyles.timeText, { color: colors.textMuted }]}>{timeAgo(post.created_at)}</Text>
                    </View>
                </TouchableOpacity>
                {post.is_owner && (
                    <TouchableOpacity onPress={handleMenuPress}>
                        <MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {post.caption ? (
                <Text style={[postStyles.caption, { color: colors.text }]}>{post.caption}</Text>
            ) : null}

            {post.image ? (
                <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={() => {
                        const now = Date.now();
                        if (now - lastTap.current < 300) {
                            if (tapTimer.current) clearTimeout(tapTimer.current);
                            if (!post.is_liked) handleLike();
                            lastTap.current = 0;
                        } else {
                            lastTap.current = now;
                            tapTimer.current = setTimeout(() => {
                                tapTimer.current = null;
                            }, 300);
                        }
                    }}
                >
                    <Image source={{ uri: post.image }} style={postStyles.postImage} resizeMode="cover" />
                </TouchableOpacity>
            ) : null}

            <View style={[postStyles.actions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={postStyles.actionBtn} onPress={handleLike}>
                    <Animated.View style={{ transform: [{ scale }] }}>
                        <MaterialCommunityIcons
                            name={post.is_liked ? 'heart' : 'heart-outline'}
                            size={22}
                            color={post.is_liked ? '#EF4444' : colors.textMuted}
                        />
                    </Animated.View>
                    <Text style={[postStyles.actionCount, { color: colors.textSecondary }]}>{post.likes_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={postStyles.actionBtn} onPress={handleOpenComments}>
                    <MaterialCommunityIcons name="comment-outline" size={22} color={colors.textMuted} />
                    <Text style={[postStyles.actionCount, { color: colors.textSecondary }]}>{post.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={postStyles.actionBtn} onPress={() => setShowShare(true)}>
                    <MaterialCommunityIcons name="share-outline" size={22} color={colors.textMuted} />
                </TouchableOpacity>
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
}

const postStyles = StyleSheet.create({
    card: {
        marginHorizontal: 16, marginBottom: 12,
        borderRadius: 20, borderWidth: 1,
        overflow: 'hidden',
    },
    postHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', padding: 14,
    },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B' },
    authorName: { fontSize: 14, fontWeight: '700' },
    timeText: { fontSize: 11, marginTop: 1 },
    caption: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 10 },
    postImage: { width: '100%', height: 280 },
    actions: {
        flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
        borderTopWidth: 1, gap: 24,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionCount: { fontSize: 13, fontWeight: '600' },
});
