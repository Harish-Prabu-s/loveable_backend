import { create } from 'zustand';
import { authApi } from '@/api/auth';
import type { User, Gender } from '@/types';
import { storage } from '@/lib/storage';
import { DeviceEventEmitter } from 'react-native';

interface AuthState {
  user: User | null;
  token: string | null;
  tempToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  login: (phoneNumber: string, otpCode: string) => Promise<boolean>;
  loginWithOTP: (phoneNumber: string, otpCode: string) => Promise<boolean>;
  loginWithEmailOTP: (email: string, otpCode: string) => Promise<boolean>;
  loginWithFirebase: (idToken: string, phoneNumber: string) => Promise<boolean>;
  setCredentials: (user: User, accessToken: string, refreshToken: string) => void;
  setTempToken: (token: string | null) => void;
  logout: () => Promise<void>;
  selectGender: (gender: Gender) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  tempToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    // Prevent multiple initializations
    if (get().isInitialized) return;

    try {
      const token = await storage.getItem('accessToken');
      const userStr = await storage.getItem('user');
      const tempToken = await storage.getItem('temp_token');

      if (token && userStr) {
        set({
          token,
          user: JSON.parse(userStr),
          isAuthenticated: true,
          tempToken
        });
      } else if (tempToken) {
        set({
          tempToken
        })
      }
    } catch (e) {
      console.error('Failed to parse user from storage', e);
      await storage.removeItem('user');
    } finally {
      set({ isInitialized: true });

      // Listen for logout events from AuthContext or ApiClient
      const sub = DeviceEventEmitter.addListener('auth:logout', () => {
        set({ user: null, token: null, tempToken: null, isAuthenticated: false });
      });
      // sub.remove() should be handled in a component or where the store resides if possible, 
      // but for global store listeners they usually persist.
    }
  },

  login: async (phoneNumber: string, otpCode: string) => {
    return await get().loginWithOTP(phoneNumber, otpCode);
  },

  loginWithOTP: async (phoneNumber: string, otpCode: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verifyOTP({
        phone_number: phoneNumber,
        otp_code: otpCode,
      });

      const isNewUser = response.is_new_user === true || String(response.is_new_user).toLowerCase() === 'true';

      if (isNewUser) {
        const tempToken = response.temp_token || response.access || response.access_token || '';
        await storage.setItem('temp_token', tempToken);
        set({ tempToken });
      } else {
        const token = response.access || response.access_token || response.token;
        const refreshToken = response.refresh || response.refresh_token;

        if (token) await storage.setItem('accessToken', token);
        if (refreshToken) await storage.setItem('refreshToken', refreshToken);
        if (response.user) await storage.setItem('user', JSON.stringify(response.user));

        set({
          user: response.user || null,
          token: token || null,
          isAuthenticated: !!token,
          tempToken: null
        });
      }

      return isNewUser;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithEmailOTP: async (email: string, otpCode: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verifyOTPEmail({
        email: email,
        otp: otpCode,
      });

      const isNewUser = response.is_new_user === true || String(response.is_new_user).toLowerCase() === 'true';
      const token = response.access || response.access_token || response.token || '';
      const refreshToken = response.refresh || response.refresh_token || '';

      if (token) await storage.setItem('accessToken', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (response.user) await storage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user || null,
        token: token || null,
        isAuthenticated: !!token,
      });

      return isNewUser;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithFirebase: async (idToken: string, phoneNumber: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.loginWithFirebase({
        id_token: idToken,
        phone_number: phoneNumber,
      });

      const isNewUser = response.is_new_user === true || String(response.is_new_user).toLowerCase() === 'true';
      const token = response.access || response.access_token || response.token || '';
      const refreshToken = response.refresh || response.refresh_token || '';

      if (token) await storage.setItem('accessToken', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (response.user) await storage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user || null,
        token: token || null,
        isAuthenticated: !!token,
      });

      return isNewUser;
    } finally {
      set({ isLoading: false });
    }
  },

  setCredentials: (user: User, accessToken: string, refreshToken: string) => {
    if (accessToken) storage.setItem('accessToken', accessToken);
    if (refreshToken) storage.setItem('refreshToken', refreshToken);
    if (user) storage.setItem('user', JSON.stringify(user));
    set({ user, token: accessToken, isAuthenticated: true });
  },

  setTempToken: (token: string | null) => {
    set({ tempToken: token });
  },

  logout: async () => {
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    await storage.removeItem('temp_token');
    set({ user: null, token: null, tempToken: null, isAuthenticated: false });
    // Notify AuthContext and other listeners
    DeviceEventEmitter.emit('auth:logout');
  },

  selectGender: async (gender: Gender) => {
    set({ isLoading: true });
    try {
      const updatedUser = await authApi.selectGender({ gender });
      if (updatedUser) {
        await storage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.updateProfile(data);
      const updatedUser = resp.user;
      if (updatedUser) {
        await storage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  uploadAvatar: async (uri: string) => {
    set({ isLoading: true });
    try {
      const { photo_url } = await authApi.uploadAvatar(uri);
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, photo: photo_url };
        await storage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const user = await authApi.getUser();
      if (user) {
        await storage.setItem('user', JSON.stringify(user));
        set({ user });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
