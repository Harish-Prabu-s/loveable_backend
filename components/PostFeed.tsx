import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { postsApi, Post } from '@/api/posts';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/utils/toast';

export default function PostFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const data = await postsApi.getFeed();
            setPosts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = async (postId: number, index: number) => {
        const previousState = posts[index].is_liked;
        const previousCount = posts[index].likes_count;

        // Optimistic UI update
        const newPosts = [...posts];
        newPosts[index].is_liked = !previousState;
        newPosts[index].likes_count = previousState ? Math.max(0, previousCount - 1) : previousCount + 1;
        setPosts(newPosts);

        try {
            const res = await postsApi.toggleLike(postId);
            // Verify final state from server
            setPosts(current => {
                const finalPosts = [...current];
                if (finalPosts[index]) {
                    finalPosts[index].is_liked = res.is_liked;
                    finalPosts[index].likes_count = res.likes_count;
                }
                return finalPosts;
            });
        } catch (e) {
            console.error(e);
            // Revert
            setPosts(current => {
                const revertPosts = [...current];
                if (revertPosts[index]) {
                    revertPosts[index].is_liked = previousState;
                    revertPosts[index].likes_count = previousCount;
                }
                return revertPosts;
            });
            toast.error("Failed to update like");
        }
    };

    const renderPost = ({ item, index }: { item: Post, index: number }) => (
        <View style={styles.postContainer}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.photo || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                    <View>
                        <Text style={styles.username}>{item.display_name || item.username}</Text>
                    </View>
                </View>
                <TouchableOpacity>
                    <MaterialCommunityIcons name="dots-vertical" size={24} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            {/* Image */}
            {item.image && (
                <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={() => toggleLike(item.id, index)} style={styles.actionBtn}>
                        <MaterialCommunityIcons
                            name={item.is_liked ? "heart" : "heart-outline"}
                            size={28}
                            color={item.is_liked ? "#EF4444" : "#F8FAFC"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <MaterialCommunityIcons name="comment-outline" size={26} color="#F8FAFC" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <MaterialCommunityIcons name="send-outline" size={26} color="#F8FAFC" style={{ transform: [{ rotate: '-45deg' }], marginTop: -4 }} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="bookmark-outline" size={28} color="#F8FAFC" />
                </TouchableOpacity>
            </View>

            {/* Details */}
            <View style={styles.details}>
                <Text style={styles.likes}>{item.likes_count} likes</Text>

                {item.caption ? (
                    <Text style={styles.captionContainer}>
                        <Text style={styles.captionUsername}>{item.display_name || item.username} </Text>
                        <Text style={styles.caption}>{item.caption}</Text>
                    </Text>
                ) : null}

                {item.comments_count > 0 && (
                    <Text style={styles.commentsText}>View all {item.comments_count} comments</Text>
                )}

                <Text style={styles.timeText}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
            </View>
        </View>
    );

    if (loading) {
        return <ActivityIndicator style={{ padding: 40 }} color="#3B82F6" />;
    }

    return (
        <FlatList
            data={posts}
            keyExtractor={p => p.id.toString()}
            renderItem={renderPost}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
        />
    );
}

const styles = StyleSheet.create({
    postContainer: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        backgroundColor: '#1E293B',
    },
    username: {
        color: '#F8FAFC',
        fontWeight: 'bold',
        fontSize: 14,
    },
    postImage: {
        width: '100%',
        aspectRatio: 1, // Square image
        backgroundColor: '#0F172A',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        paddingBottom: 6,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        marginRight: 16,
    },
    details: {
        paddingHorizontal: 12,
    },
    likes: {
        color: '#F8FAFC',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    captionContainer: {
        marginBottom: 4,
    },
    captionUsername: {
        color: '#F8FAFC',
        fontWeight: 'bold',
    },
    caption: {
        color: '#F8FAFC',
    },
    commentsText: {
        color: '#94A3B8',
        marginTop: 2,
        marginBottom: 4,
    },
    timeText: {
        color: '#64748B',
        fontSize: 11,
    }
});
