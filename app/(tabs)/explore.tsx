import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import { profilesApi } from '@/api/profiles';
import { walletApi } from '@/api/wallet';
import { gamificationApi } from '@/api/gamification';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getMediaUrl } from '@/utils/media';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const { user } = useAuthStore();
  const { wallet, fetchWallet } = useWalletStore();

  const [profile, setProfile] = useState<any>(null);
  const [level, setLevel] = useState<any>(null);
  const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [profileData, walletData, levelData, usersData] = await Promise.all([
        profilesApi.getProfile().catch(() => null),
        fetchWallet().catch(() => null),
        gamificationApi.getLevel().catch(() => null),
        profilesApi.listProfiles().catch(() => []),
      ]);

      setProfile(profileData);
      setLevel(levelData);
      setRecommendedUsers(usersData || []);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F9FAFB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F9FAFB" />
        }
      >
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 600 }}
        >
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Hi, {profile?.display_name || 'Friend'}! ✨</Text>
                <Text style={styles.subGreeting}>Ready to connect?</Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push('/(tabs)/chat' as any)}
                >
                  <MaterialCommunityIcons name="message-text" size={24} color="#FFFFFF" />
                  <View style={styles.notificationDot} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push('/(tabs)/profile' as any)}
                >
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
              <TouchableOpacity
                style={styles.coinBadge}
                onPress={() => router.push('/(tabs)/wallet' as any)}
              >
                <MaterialCommunityIcons name="database" size={20} color="#FBBF24" />
                <Text style={styles.coinText}>{wallet?.coin_balance ?? 0}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { label: 'Discover', icon: 'compass', colors: ['#A855F7', '#7C3AED'], path: '/(tabs)/discover' },
            { label: 'Chat', icon: 'message-text', colors: ['#EC4899', '#DB2777'], path: '/(tabs)/chat' },
            { label: 'Wallet', icon: 'wallet', colors: ['#F59E0B', '#D97706'], path: '/(tabs)/wallet' },
            { label: 'Profile', icon: 'account', colors: ['#3B82F6', '#2563EB'], path: '/(tabs)/profile' },
          ].map((action, index) => (
            <MotiView
              key={action.label}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 300 + (index * 100) }}
            >
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push(action.path as any)}
              >
                <LinearGradient colors={action.colors as any} style={styles.actionIcon}>
                  <MaterialCommunityIcons name={action.icon as any} size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Mood Grid */}
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800, delay: 500 }}
          style={styles.moodSection}
        >
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodGrid}>
            {moods.map((mood, index) => (
              <MotiView
                key={mood.label}
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 700 + (index * 50) }}
              >
                <TouchableOpacity
                  style={styles.moodCard}
                  onPress={() => router.push('/(tabs)/discover' as any)}
                >
                  <View style={[styles.moodIconContainer, { backgroundColor: mood.bg }]}>
                    <MaterialCommunityIcons name={mood.icon as any} size={24} color={mood.color} />
                  </View>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </MotiView>

        {/* Recommended Users */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 1000 }}
          style={styles.usersSection}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)}>
              <Text style={styles.viewAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.usersScroll}>
            {recommendedUsers.map((item, index) => (
              <MotiView
                key={item.id}
                from={{ opacity: 0, translateX: 50 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', delay: 1200 + (index * 100) }}
              >
                <TouchableOpacity style={styles.userCard}
                  onPress={() => router.push(`/user/${item.user}` as any)}
                >
                  <Image
                    source={{ uri: getMediaUrl(item.photo) || 'https://via.placeholder.com/150' }}
                    style={styles.userAvatar}
                  />
                  <Text style={styles.userName} numberOfLines={1}>{item.display_name}</Text>
                  <View style={styles.onlineBadge}>
                    <View style={[styles.statusDot, { backgroundColor: item.is_online ? '#10B981' : '#64748B' }]} />
                    <Text style={styles.statusText}>{item.is_online ? 'Online' : 'Offline'}</Text>
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))}
          </ScrollView>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 24,
    paddingTop: 48,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 24,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  coinText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  moodSection: {
    padding: 24,
    marginTop: -20,
    backgroundColor: '#0F172A',
    marginHorizontal: 20,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  moodCard: {
    width: (width - 100) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  moodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  usersSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#EC4899',
    fontWeight: '600',
  },
  usersScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  userCard: {
    width: 120,
    marginRight: 16,
    alignItems: 'center',
  },
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#EC4899',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
