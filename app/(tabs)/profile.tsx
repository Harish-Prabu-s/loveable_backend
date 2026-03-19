import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/context/AuthContext';
import { profilesApi } from '@/api/profiles';
import { notificationsApi } from '@/api/notifications';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { useTheme } from '@/context/ThemeContext';
import { authApi } from '@/api/auth';

export default function ProfileScreen() {
  const { user, logout: storeLogout } = useAuthStore();
  const { logout: authContextLogout } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifToggling, setNotifToggling] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, 200],
      [280, 100],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [100, 200],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      height,
    };
  });

  const avatarAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0.5],
      Extrapolate.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 200],
      [0, -20],
      Extrapolate.CLAMP
    );
    return {
      transform: [
        { scale: scale },
        { translateY: translateY }
      ] as any,
    };
  });

  const infoOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [50, 150],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const loadProfile = useCallback(async () => {
    try {
      const [data, settings] = await Promise.all([
        profilesApi.getProfile(),
        notificationsApi.getSettings().catch(() => null),
      ]);
      setProfile(data);
      if (settings) setNotificationsEnabled(settings.notifications_enabled);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch every time this tab comes into focus so follower/following counts update
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // Instant update from other screens
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('profile:following_changed', (delta: number) => {
      setProfile((prev: any) => prev ? { ...prev, following_count: Math.max(0, (prev.following_count || 0) + delta) } : prev);
    });
    return () => sub.remove();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await authApi.logout();
              } catch (apiError) {
                console.error('API Logout failed:', apiError);
              }

              await Promise.all([
                AsyncStorage.removeItem('access_token'),
                AsyncStorage.removeItem('refresh_token'),
                AsyncStorage.removeItem('user'),
                AsyncStorage.removeItem('temp_token'),
              ]);
              await authContextLogout();
              await storeLogout();

              // Let the _layout.tsx useProtectedRoute handle redirect automatically!
            } catch (e) {
              console.error('Logout failed:', e);
            }
          },
        },
      ]
    );
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifToggling(true);
    setNotificationsEnabled(value);
    try {
      await notificationsApi.updateSettings({ notifications_enabled: value });
    } catch {
      // Revert on failure
      setNotificationsEnabled(!value);
      Alert.alert('Error', 'Could not update notification settings');
    } finally {
      setNotifToggling(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            style={[StyleSheet.absoluteFill, styles.headerGradient]}
          />

          <Animated.View style={[styles.profileInfo, avatarAnimatedStyle]}>
            <MotiView
              from={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 100 }}
            >
              <Image
                source={{
                  uri:
                    getMediaUrl(profile?.photo) ||
                    generateAvatarUrl(profile?.id ?? user?.id ?? 'me', user?.gender as any)
                }}
                style={styles.avatar}
              />
            </MotiView>
            <Animated.View style={[styles.textInfo, infoOpacityStyle]}>
              <Text style={styles.name}>{profile?.display_name || 'User'}</Text>
              <Text style={styles.username}>@{profile?.username || 'username'}</Text>
            </Animated.View>
          </Animated.View>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 300 }}
            style={[styles.statsContainer, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
          >
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/network/followers?userId=${user?.id}` as any)}>
              <Text style={styles.statNumber}>{profile?.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/network/following?userId=${user?.id}` as any)}>
              <Text style={styles.statNumber}>{profile?.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </MotiView>
        </Animated.View>

        {/* Menu Options */}
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 400 }}
          style={[styles.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>Account Settings</Text>

          {/* Settings */}
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/settings' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Settings</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/settings/edit-profile' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
              <MaterialCommunityIcons name="account-edit" size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Edit Profile</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => Alert.alert('Privacy & Safety', 'Your data is encrypted and safe. We never share your information with third parties.')}>
            <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#22C55E" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Privacy & Safety</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/settings/close-friends' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
              <MaterialCommunityIcons name="heart-multiple" size={24} color="#10B981" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Close Friends</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/archive' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="archive-outline" size={24} color="#0EA5E9" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Archive</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Notification Toggle */}
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF9C3' }]}>
              <MaterialCommunityIcons
                name={notificationsEnabled ? 'bell' : 'bell-off'}
                size={24}
                color="#EAB308"
              />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              disabled={notifToggling}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          <Text style={[styles.menuTitle, { marginTop: 24, color: colors.textSecondary }]}>Support</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => Alert.alert('Help Center', 'For support, email us at support@loveableapp.com or visit our website.')}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={colors.textSecondary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Help Center</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push('/settings/delete-account' as any)}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="account-remove" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.danger }]}>Delete Account</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={[styles.menuItem, { marginTop: 16 }]} onPress={handleLogout}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.menuLabel, { color: '#EF4444' }]}>Logout</Text>
          </TouchableOpacity>
        </MotiView>
      </Animated.ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  headerGradient: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
  },
  profileInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 20,
  },
  textInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 30,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuContainer: {
    padding: 24,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
});

