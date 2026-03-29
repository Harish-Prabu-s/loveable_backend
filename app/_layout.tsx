import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { View, ActivityIndicator, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import GlobalToast from '@/components/ui/GlobalToast';

// Push token registration (runs silently after login)
async function registerForPushNotifications() {
  try {
    // Silence push notification warning on Expo Go (SDK 53+)
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return;
    }

    // Dynamically import to avoid crash if expo-notifications not installed
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData?.data) return;

    const { notificationsApi } = await import('@/api/notifications');
    await notificationsApi.registerPushToken(tokenData.data, Platform.OS).catch(() => {
      // Silently ignore — backend might be offline
    });
  } catch {
    // Silently ignore any errors
  }
}

// Custom hook to protect routes directly in the layout
function useProtectedRoute() {
  const { token, tempToken, user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const currentPath = segments.join('/');
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    console.log(`[Routing] Segments: ${JSON.stringify(segments)} | Token: ${!!token} | TempToken: ${!!tempToken} | Path: /${currentPath}`);

    if (token) {
      // User is fully authenticated
      if (inAuthGroup || inOnboarding || currentPath === '') {
        console.log('[Routing] Authenticated -> Redirecting to Tabs');
        router.replace('/(tabs)');
      }
    } else if (tempToken) {
      // New user in onboarding flow
      if (!inOnboarding) {
        console.log('[Routing] New User (TempToken) -> Redirecting to Onboarding');
        router.replace('/onboarding/name');
      }
    } else {
      // No token at all
      if (!inAuthGroup) {
        console.log('[Routing] Unauthenticated -> Redirecting to Login');
        router.replace('/(auth)/phone');
      }
    }
  }, [token, tempToken, isLoading, segments, navigationState?.key]);
}

export const unstable_settings = {
  anchor: '(auth)',
};

import { SecurityLock } from '@/components/SecurityLock';
import { useSecurityStore } from '@/store/securityStore';
import { AppState, AppStateStatus } from 'react-native';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { isLoading, token } = useAuth();
  const { initialize: initSecurity, setLocked, recordBackgroundTime, checkLockNeeded } = useSecurityStore();

  // Apply our route protection directly
  useProtectedRoute();

  // Initialize security store
  useEffect(() => {
    initSecurity();
  }, []);

  // Handle AppState for security lock
  const segments = useSegments();
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        recordBackgroundTime();
      } else if (nextAppState === 'active') {
        const isRecoveryRoute = 
          (segments.length > 1 && segments[0] === 'settings' && segments[1] === 'reset-app-lock') ||
          (segments.length > 1 && segments[0] === 'security' && segments[1] === 'recovery');

        if (checkLockNeeded() && !isRecoveryRoute) {
          setLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [segments, checkLockNeeded, setLocked, recordBackgroundTime]);

  // Register Expo push token whenever the user logs in
  useEffect(() => {
    if (token) {
      registerForPushNotifications();
    }
  }, [token]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            animation: 'slide_from_right', // iOS-like slide transition as standard
            headerShown: false,
            contentStyle: { backgroundColor: colors.background }
          }}
        >
          {/* Auth group — phone & otp */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Main tabs (home + nested routes) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Onboarding flow */}
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />

          {/* Deep screens */}
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
          <Stack.Screen name="games" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="wallet/purchase" options={{ headerShown: false }} />
          <Stack.Screen name="wallet/transactions" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/delete-account" options={{ headerShown: false }} />
          <Stack.Screen name="settings/edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="settings/set-pin" options={{ headerShown: false }} />
          <Stack.Screen name="settings/set-pattern" options={{ headerShown: false }} />
          <Stack.Screen name="settings/biometric-setup" options={{ headerShown: false }} />
          <Stack.Screen name="network/followers" options={{ headerShown: false }} />
          <Stack.Screen name="network/following" options={{ headerShown: false }} />
          <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="story/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="call/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="call/raw/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="test-nav" options={{ headerShown: false }} />
          <Stack.Screen name="media-viewer" options={{ headerShown: false }} />
        </Stack>
        <SecurityLock />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

import { SecurityProvider } from '@/context/SecurityContext';

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <SecurityProvider>
          <NotificationProvider>
            <RootLayoutNav />
          </NotificationProvider>
          <GlobalToast />
        </SecurityProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}
