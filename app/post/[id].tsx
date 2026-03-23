import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PostCard } from '@/components/PostCard';
import { postsApi, Post } from '@/api/posts';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/utils/toast';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const data = await postsApi.getPost(Number(id));
      setPost(data);
    } catch (e) {
      console.error('Failed to load post:', e);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (!post) return;
    const previousState = post.is_liked;
    const previousCount = post.likes_count;
    
    // Optimistic update
    setPost({
      ...post,
      is_liked: !previousState,
      likes_count: previousState ? previousCount - 1 : previousCount + 1
    });

    try {
      await postsApi.toggleLike(postId);
    } catch (e) {
      // Revert on error
      setPost({
        ...post,
        is_liked: previousState,
        likes_count: previousCount
      });
      toast.error("Failed to like post");
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Post not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ 
        title: 'Post',
        headerTransparent: false,
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
            <MaterialCommunityIcons name="chevron-left" size={30} color={colors.text} />
          </TouchableOpacity>
        ),
      }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PostCard post={post} onLike={handleLike} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingVertical: 10 },
  errorText: { marginTop: 10, fontSize: 16 },
  backBtn: { marginTop: 20 },
});
