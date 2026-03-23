import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { profilesApi } from '@/api/profiles';
import { gamificationApi } from '@/api/gamification';
import { postsApi, Post } from '@/api/posts';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useTheme } from '@/context/ThemeContext';
import StoryList from '@/components/StoryList';
import StoryViewer from '@/components/StoryViewer';
import CreateStory from '@/components/CreateStory';
import { storiesApi, Story } from '@/api/stories';
import CreateReel from '@/components/CreateReel';
import CreateStreak from '@/components/CreateStreak';
import { useNotifications } from '@/context/NotificationContext';
import { archiveApi } from '@/api/archive';

const { width } = Dimensions.get('window');

import { PostCard } from '@/components/PostCard';
import { toast } from '@/utils/toast';
import { getAvatarUri, timeAgo } from '@/utils/avatar';

// ─── Post Creation Modal ──────────────────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  myAvatar: string;
  onClose: () => void;
  onPosted: (post: Post) => void;
}

function CreatePostModal({ visible, myAvatar, onClose, onPosted }: CreatePostModalProps) {
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState<'all' | 'close_friends'>('all');
  const { colors } = useTheme();

  const resetForm = () => {
    setCaption('');
    setImageUri(null);
    setVisibility('all');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!caption.trim() && !imageUri) {
      Alert.alert('Empty Post', 'Please add a caption or photo before posting.');
      return;
    }
    setPosting(true);
    try {
      const newPost = await postsApi.createPost(caption.trim(), imageUri ?? undefined, visibility);
      onPosted(newPost);
      handleClose();
    } catch (e: any) {
      Alert.alert('Post Failed', e?.response?.data?.detail || 'Could not create post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal Header */}
        <View style={[createStyles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={createStyles.cancelBtn}>
            <Text style={[createStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[createStyles.headerTitle, { color: colors.text }]}>New Post</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={posting}
            style={[createStyles.postBtn, { backgroundColor: colors.primary, opacity: posting ? 0.6 : 1 }]}
          >
            {posting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={createStyles.postBtnText}>Post</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Author row */}
          <View style={createStyles.authorRow}>
            <Image source={{ uri: myAvatar }} style={createStyles.myAvatar} />
            <TextInput
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textMuted}
              style={[createStyles.captionInput, { color: colors.text }]}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
              autoFocus
            />
          </View>

          {/* Selected Image Preview */}
          {imageUri ? (
            <View style={createStyles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={createStyles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={createStyles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <MaterialCommunityIcons name="close-circle" size={28} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Media buttons */}
          <View style={[createStyles.mediaRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={createStyles.mediaBtn} onPress={openCamera}>
              <LinearGradient colors={['#EC4899', '#8B5CF6']} style={createStyles.mediaBtnGrad}>
                <MaterialCommunityIcons name="camera" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={[createStyles.mediaBtnLabel, { color: colors.textSecondary }]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={createStyles.mediaBtn} onPress={pickFromGallery}>
              <LinearGradient colors={['#3B82F6', '#6366F1']} style={createStyles.mediaBtnGrad}>
                <MaterialCommunityIcons name="image-multiple" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={[createStyles.mediaBtnLabel, { color: colors.textSecondary }]}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Visibility Section */}
          <View style={[createStyles.visibilityRow, { borderTopColor: colors.border }]}>
            <Text style={[createStyles.visibilityLabel, { color: colors.textSecondary }]}>Who can see this?</Text>
            <View style={createStyles.visibilityOptions}>
              <TouchableOpacity
                style={[
                  createStyles.visibilityOption,
                  visibility === 'all' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => setVisibility('all')}
              >
                <MaterialCommunityIcons name="earth" size={20} color={visibility === 'all' ? colors.primary : colors.textMuted} />
                <Text style={[createStyles.visibilityText, { color: visibility === 'all' ? colors.primary : colors.textMuted }]}>Everyone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  createStyles.visibilityOption,
                  visibility === 'close_friends' && { backgroundColor: '#10B98120', borderColor: '#10B981' }
                ]}
                onPress={() => setVisibility('close_friends')}
              >
                <MaterialCommunityIcons name="heart-multiple" size={20} color={visibility === 'close_friends' ? '#10B981' : colors.textMuted} />
                <Text style={[createStyles.visibilityText, { color: visibility === 'close_friends' ? '#10B981' : colors.textMuted }]}>Close Friends</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[createStyles.charCount, { color: colors.textMuted }]}>{caption.length}/500</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 64 },
  cancelText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  postBtn: {
    paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: 20, minWidth: 64, alignItems: 'center',
  },
  postBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  authorRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  myAvatar: {
    width: 44, height: 44, borderRadius: 22,
    marginRight: 12, backgroundColor: '#1E293B',
  },
  captionInput: {
    flex: 1, fontSize: 16, lineHeight: 22,
    minHeight: 80, textAlignVertical: 'top',
  },
  imagePreviewWrap: { position: 'relative', marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 240, borderRadius: 16 },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
  },
  mediaRow: {
    flexDirection: 'row', gap: 20,
    borderTopWidth: 1, paddingTop: 16, marginTop: 8,
  },
  mediaBtn: { alignItems: 'center', gap: 6 },
  mediaBtnGrad: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaBtnLabel: { fontSize: 12, fontWeight: '600' },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 8 },
  visibilityRow: { marginTop: 24, paddingTop: 16, borderTopWidth: 1 },
  visibilityLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  visibilityOptions: { flexDirection: 'row', gap: 12 },
  visibilityOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
  },
  visibilityText: { fontSize: 14, fontWeight: '600' },
});

import { CommentSheet } from '@/components/CommentSheet';
import { ShareSheet } from '@/components/ShareSheet';


// ─── Main Home Screen ─────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { wallet, fetchWallet } = useWalletStore();
  const { colors } = useTheme();
  const { newNotification } = useNotifications();

  const [profile, setProfile] = useState<any>(null);
  const [level, setLevel] = useState<any>(null);
  const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreateReel, setShowCreateReel] = useState(false);
  const [showCreateStreak, setShowCreateStreak] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const myAvatar = getAvatarUri(profile?.photo, user?.id ?? 'me', user?.gender);

  const loadData = useCallback(async () => {
    try {
      const oppGender = user?.gender === 'M' ? 'F' : user?.gender === 'F' ? 'M' : undefined;
      const lang = user?.language;
      const filterParams: any = {};
      if (oppGender) filterParams.gender = oppGender;
      if (lang) filterParams.language = lang;

      const [profileData, , levelData, usersData, feedData, storiesData] = await Promise.all([
        profilesApi.getProfile().catch(() => null),
        fetchWallet().catch(() => null),
        gamificationApi.getLevel().catch(() => null),
        profilesApi.listProfiles(undefined, filterParams).catch(() => []),
        postsApi.getFeed().catch(() => []),
        storiesApi.getStories().catch(() => []),
      ]);

      setProfile(profileData);
      setLevel(levelData);
      setRecommendedUsers(usersData || []);
      setPosts(feedData || []);
      const sortedStories = (storiesData || []).sort((a: Story, b: Story) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setStories(sortedStories);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.gender, user?.language]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Instant update from other screens
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('profile:following_changed', (delta: number) => {
      setProfile((prev: any) => prev ? { ...prev, following_count: Math.max(0, (prev.following_count || 0) + delta) } : prev);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (newNotification) {
      toast.info(newNotification.message || "New notification", undefined, () => {
        const type = newNotification.type;
        if (type === 'mention_story' || type === 'mention_story_comment' || type === 'story_like' || type === 'story_comment') {
          if (newNotification.object_id) router.push(`/story/${newNotification.object_id}` as any);
        } else if (type === 'mention_post' || type === 'mention_comment') {
          if (newNotification.object_id) router.push(`/post/${newNotification.object_id}` as any);
        } else if (type === 'mention_reel' || type === 'mention_reel_comment') {
          if (newNotification.object_id) router.push(`/reel/${newNotification.object_id}` as any);
        } else if (newNotification.actor) {
          router.push(`/user/${newNotification.actor.id}` as any);
        }
      });
    }
  }, [newNotification]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleLike = async (postId: number) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      await postsApi.toggleLike(postId);
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        )
      );
    }
  };

  const handlePosted = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const moods = [
    { icon: 'emoticon-sad', label: 'Lonely', color: '#A855F7', bg: '#F3E8FF' },
    { icon: 'coffee', label: 'Bored', color: '#F97316', bg: '#FFEDD5' },
    { icon: 'hand-heart', label: 'Need Advice', color: '#EAB308', bg: '#FEF9C3' },
    { icon: 'emoticon-happy', label: 'Happy', color: '#22C55E', bg: '#DCFCE7' },
    { icon: 'flash', label: 'Stressed', color: '#EF4444', bg: '#FEE2E2' },
    { icon: 'message-text', label: 'Just Talk', color: '#3B82F6', bg: '#DBEAFE' },
  ];

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={['#EC4899', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hi, {profile?.display_name || user?.display_name || 'Friend'}! ✨</Text>
              <Text style={styles.subGreeting}>Ready to connect?</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/chat' as any)}>
                <MaterialCommunityIcons name="message-text" size={24} color="#FFFFFF" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/profile' as any)}>
                <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statBadge} onPress={() => profile?.user && router.push(`/network/followers?userId=${profile.user}` as any)}>
                <MaterialCommunityIcons name="account-group" size={14} color="#FFFFFF" />
                <Text style={styles.statText}>{profile?.followers_count || 0} Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBadge} onPress={() => profile?.user && router.push(`/network/following?userId=${profile.user}` as any)}>
                <MaterialCommunityIcons name="account-check" size={14} color="#FFFFFF" />
                <Text style={styles.statText}>{profile?.following_count || 0} Following</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.coinBadge} onPress={() => router.push('/(tabs)/wallet' as any)}>
              <MaterialCommunityIcons name="database" size={20} color="#FBBF24" />
              <Text style={styles.coinText}>{wallet?.coin_balance ?? 0}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Stories ── */}
        <StoryList
          stories={stories}
          profile={profile}
          onStoryPress={(story: Story) => {
            setActiveStory(story);
            setShowStoryViewer(true);
          }}
          onCreatePress={() => setShowCreateStory(true)}
        />

        {/* ── Create Post Banner ── */}
        <TouchableOpacity
          style={[styles.createPostBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowCreatePost(true)}
          activeOpacity={0.85}
        >
          <Image source={{ uri: myAvatar }} style={styles.createPostAvatar} />
          <View style={[styles.createPostInput, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.createPostPlaceholder, { color: colors.textMuted }]}>
              What's on your mind?
            </Text>
          </View>
          <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.createPostIconBtn}>
            <MaterialCommunityIcons name="image-plus" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/discover' as any)}>
            <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.actionIcon}>
              <MaterialCommunityIcons name="compass" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/chat' as any)}>
            <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.actionIcon}>
              <MaterialCommunityIcons name="message-text" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/wallet' as any)}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionIcon}>
              <MaterialCommunityIcons name="wallet" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/profile' as any)}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionIcon}>
              <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/games' as any)}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.actionIcon}>
              <MaterialCommunityIcons name="gamepad-variant" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Games</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/streaks-view' as any)}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.actionIcon}>
              <MaterialCommunityIcons name="fire" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Streaks</Text>
          </TouchableOpacity>
        </View>

        {/* ── Mood Grid ── */}
        <View style={[styles.moodSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>How are you feeling?</Text>
          <View style={styles.moodGrid}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.label}
                style={[styles.moodCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/discover' as any)}
              >
                <View style={[styles.moodIconContainer, { backgroundColor: mood.bg }]}>
                  <MaterialCommunityIcons name={mood.icon as any} size={24} color={mood.color} />
                </View>
                <Text style={[styles.moodLabel, { color: colors.text }]}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recommended Users ── */}
        {recommendedUsers.length > 0 && (
          <View style={styles.usersSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recommended for You</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)}>
                <Text style={styles.viewAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.usersScroll}>
              {(Array.isArray(recommendedUsers) ? recommendedUsers : []).map((item) => (
                <TouchableOpacity key={item.id} style={styles.userCard} onPress={() => router.push(`/user/${item.user}` as any)}>
                  <Image source={{ uri: getAvatarUri(item.photo, item.id, item.gender) }} style={styles.userAvatar} />
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.display_name || 'User'}</Text>
                  <View style={styles.onlineBadge}>
                    <View style={[styles.statusDot, { backgroundColor: item.is_online ? '#10B981' : '#64748B' }]} />
                    <Text style={[styles.statusText, { color: colors.textMuted }]}>{item.is_online ? 'Online' : 'Offline'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Social Feed ── */}
        <View style={styles.feedSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Posts</Text>
          </View>
          {posts.length === 0 ? (
            <View style={[styles.emptyFeed, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="image-off-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyFeedText, { color: colors.text }]}>No posts yet</Text>
              <Text style={[styles.emptyFeedSub, { color: colors.textMuted }]}>Be the first to post something!</Text>
              <TouchableOpacity style={[styles.emptyFeedBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCreatePost(true)}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                <Text style={styles.emptyFeedBtnText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onLike={handleLike} />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── FAB: Multi-action ── */}
      <View style={styles.fabContainer}>
        {showFabMenu && (
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowFabMenu(false); setShowCreateStory(true); }}>
              <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.menuIcon}>
                <MaterialCommunityIcons name="camera" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.menuLabel}>Story</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowFabMenu(false); setShowCreateReel(true); }}>
              <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.menuIcon}>
                <MaterialCommunityIcons name="movie-play" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.menuLabel}>Reel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowFabMenu(false); setShowCreatePost(true); }}>
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.menuIcon}>
                <MaterialCommunityIcons name="image-plus" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.menuLabel}>Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowFabMenu(false); setShowCreateStreak(true); }}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.menuIcon}>
                <MaterialCommunityIcons name="fire" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.menuLabel}>Streak</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowFabMenu(!showFabMenu)}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.fabGradient}>
            <MaterialCommunityIcons name={showFabMenu ? "close" : "plus"} size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Modals & Viewers ── */}
      <CreatePostModal
        visible={showCreatePost}
        myAvatar={myAvatar}
        onClose={() => setShowCreatePost(false)}
        onPosted={handlePosted}
      />

      <StoryViewer
        visible={showStoryViewer}
        story={activeStory}
        onClose={() => setShowStoryViewer(false)}
        onNext={() => {
          const idx = stories.findIndex(s => s.id === activeStory?.id);
          if (idx !== -1 && idx < stories.length - 1) setActiveStory(stories[idx + 1]);
          else setShowStoryViewer(false);
        }}
        onPrev={() => {
          const idx = stories.findIndex(s => s.id === activeStory?.id);
          if (idx > 0) setActiveStory(stories[idx - 1]);
        }}
        onDelete={async (id) => {
          try {
            await storiesApi.deleteStory(id);
            setStories(prev => prev.filter(s => s.id !== id));
            setShowStoryViewer(false);
          } catch (e: any) {
            Alert.alert('Error', 'Could not delete story');
          }
        }}
      />

      <CreateStory
        visible={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onCreated={loadData}
      />

      <CreateReel
        visible={showCreateReel}
        onClose={() => setShowCreateReel(false)}
        onCreated={() => {
          loadData();
          router.push('/(tabs)/reels' as any);
        }}
      />

      <CreateStreak 
        visible={showCreateStreak}
        onClose={() => setShowCreateStreak(false)}
        onCreated={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 100 },
  header: { padding: 24, paddingTop: 48, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subGreeting: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginBottom: 24 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  notificationDot: {
    position: 'absolute', top: 10, right: 12,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#8B5CF6',
  },
  headerStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, gap: 6,
  },
  statText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  coinText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  floatingStreaksBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 99,
  },
  floatingStreaksGrad: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingStreaksText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Create Post Banner
  createPostBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    borderRadius: 20, padding: 12, gap: 10,
    borderWidth: 1,
  },
  createPostAvatar: { width: 40, height: 40, borderRadius: 20 },
  createPostInput: {
    flex: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  createPostPlaceholder: { fontSize: 14, fontWeight: '500' },
  createPostIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  // Quick actions
  quickActions: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20,
    paddingHorizontal: 24, marginTop: 16,
  },
  actionItem: { alignItems: 'center', gap: 8, width: 64 },
  actionIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  // Mood
  actionAddBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#3B82F6',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  moodSection: {
    padding: 24, marginTop: 24,
    marginHorizontal: 16, borderRadius: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    textAlign: 'center', marginBottom: 16,
  },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  moodCard: {
    width: (width - 100) / 2, flexDirection: 'row',
    alignItems: 'center', padding: 12, borderRadius: 20, borderWidth: 1,
  },
  moodIconContainer: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  moodLabel: { fontSize: 13, fontWeight: '600' },
  // Users
  usersSection: { marginTop: 28, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  viewAllText: { fontSize: 14, color: '#EC4899', fontWeight: '600' },
  usersScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  userCard: { width: 110, marginRight: 14, alignItems: 'center' },
  userAvatar: {
    width: 96, height: 96, borderRadius: 48, marginBottom: 8,
    borderWidth: 2, borderColor: '#EC4899', backgroundColor: '#1E293B',
  },
  userName: { fontSize: 13, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '500' },
  // Feed
  feedSection: { marginTop: 28, paddingHorizontal: 0 },
  emptyFeed: {
    alignItems: 'center', padding: 32,
    marginHorizontal: 16, borderRadius: 24, borderWidth: 1, gap: 8,
  },
  emptyFeedText: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyFeedSub: { fontSize: 14 },
  emptyFeedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 8,
  },
  emptyFeedBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  // FAB & Menu
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  fab: {
    shadowColor: '#EC4899', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 12,
  },
  fabGradient: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
  },
  fabMenu: {
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 8,
    paddingRight: 16,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
