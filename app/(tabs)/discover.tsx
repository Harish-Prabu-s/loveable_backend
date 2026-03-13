import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { profilesApi } from '@/api/profiles';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

type Section = 'all' | 'popular' | 'new';

/** Returns the opposite gender code for API filtering */
function oppositeGender(gender?: string | null): string | undefined {
  if (gender === 'M') return 'F';
  if (gender === 'F') return 'M';
  return undefined; // 'O' or undefined → no filter
}

function ProfileCard({ profile }: { profile: Profile }) {
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const photo = profile.photo
    ? getMediaUrl(profile.photo) || generateAvatarUrl(profile.id, profile.gender as any)
    : generateAvatarUrl(profile.id, profile.gender as any);

  const toggleFollow = async () => {
    setFollowLoading(true);
    try {
      if (following) {
        await profilesApi.unfollow(profile.user || profile.id);
        setFollowing(false);
      } else {
        await profilesApi.follow(profile.user || profile.id);
        setFollowing(true);
      }
    } catch { /* silent */ } finally {
      setFollowLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => router.push(`/user/${profile.user || profile.id}` as any)}>
        <Image source={{ uri: photo }} style={styles.cardAvatar} />
        <LinearGradient colors={['transparent', 'rgba(2,6,23,0.95)']} style={styles.cardOverlay}>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName} numberOfLines={1}>{profile.display_name}</Text>
              {profile.is_verified && (
                <MaterialCommunityIcons name="check-decagram" size={13} color="#3B82F6" />
              )}
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: profile.is_online ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.statusText}>{profile.is_online ? 'Online' : 'Offline'}</Text>
            </View>
            {(profile.followers_count || 0) > 0 && (
              <Text style={styles.followersCount}>{profile.followers_count} followers</Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
          onPress={() => router.push({ pathname: '/call/[id]' as any, params: { id: profile.user || profile.id, callType: 'audio', calleeName: profile.display_name } })}
        >
          <MaterialCommunityIcons name="phone" size={13} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
          onPress={() => router.push({ pathname: '/call/[id]' as any, params: { id: profile.user || profile.id, callType: 'video', calleeName: profile.display_name } })}
        >
          <MaterialCommunityIcons name="video" size={13} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
          onPress={() => router.push({ pathname: '/chat/[id]' as any, params: { id: profile.user || profile.id } })}
        >
          <MaterialCommunityIcons name="chat" size={13} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: following ? '#475569' : '#EC4899', opacity: followLoading ? 0.6 : 1 }]}
          onPress={toggleFollow}
          disabled={followLoading}
        >
          <MaterialCommunityIcons name={following ? 'account-check' : 'account-plus'} size={13} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [section, setSection] = useState<Section>('all');

  const loadProfiles = useCallback(async () => {
    try {
      // Auto-filter: opposite gender + same language (backend also enforces this)
      const data = await profilesApi.listProfiles(undefined, {
        gender: oppositeGender(user?.gender),
        language: user?.language,
      });
      setProfiles(data || []);
    } catch (e) {
      console.error('Discover load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);


  useEffect(() => { loadProfiles(); }, []);

  const onRefresh = () => { setRefreshing(true); loadProfiles(); };

  const filtered = (profiles || []).filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = p.display_name?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (section === 'popular') return (p.followers_count || 0) > 0;
    if (section === 'new') return true; // sorted by created_at below
    return true;
  }).sort((a, b) => {
    if (section === 'popular') return (b.followers_count || 0) - (a.followers_count || 0);
    if (section === 'new') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    return 0;
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={150} height={32} borderRadius={8} />
        </View>
        <View style={styles.searchContainer}>
          <Skeleton width="100%" height={46} borderRadius={12} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.cardSkeleton}>
                <Skeleton width="100%" height={220} borderRadius={20} />
                <View style={{ padding: 10, gap: 5 }}>
                  <Skeleton width="70%" height={15} />
                  <Skeleton width="40%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
          <TextInput
            placeholder="Find people to connect…"
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Section Tabs */}
      <View style={styles.tabsRow}>
        {([
          { key: 'all', label: '👥 All Users' },
          { key: 'popular', label: '🔥 Popular' },
          { key: 'new', label: '✨ New' },
        ] as { key: Section; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, section === tab.key && styles.tabActive]}
            onPress={() => setSection(tab.key)}
          >
            <Text style={[styles.tabLabel, section === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
      >
        <View style={styles.grid}>
          {filtered.map(p => <ProfileCard key={p.id} profile={p} />)}
        </View>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#334155" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#1E293B' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#F1F5F9' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
  tabActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabLabelActive: { color: '#FFF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  card: { width: CARD_W, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0F172A', marginBottom: 4 },
  cardAvatar: { width: '100%', height: 220 },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, justifyContent: 'flex-end', padding: 10 },
  cardInfo: { gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, color: '#94A3B8' },
  followersCount: { fontSize: 10, color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 6, padding: 8, backgroundColor: '#0F172A' },
  actionBtn: { flex: 1, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardSkeleton: {
    width: CARD_W,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#64748B', fontSize: 16, marginTop: 12 },
});
