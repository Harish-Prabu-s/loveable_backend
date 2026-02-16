import { create } from 'zustand';
import { authApi } from '@/api/auth';
import type { User, Gender } from '@/types';
import { storage } from '@/lib/storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  login: (phoneNumber: string, otpCode: string) => Promise<boolean>;
  loginWithFirebase: (idToken: string, phoneNumber: string) => Promise<boolean>;
  setCredentials: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  selectGender: (gender: Gender) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  refreshUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: JSON.parse(storage.getItemSync('user') || 'null'),
  token: storage.getItemSync('access_token'),
  isAuthenticated: !!storage.getItemSync('access_token'),
  isLoading: false,

  initialize: async () => {
    const token = await storage.getItem('access_token');
    const userStr = await storage.getItem('user');
    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
      });
    }
  },

  login: async (phoneNumber: string, otpCode: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verifyOTP({
        phone_number: phoneNumber,
        otp_code: otpCode,
      });

      await storage.setItem('access_token', response.access_token);
      await storage.setItem('refresh_token', response.refresh_token);
      await storage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
      });
      
      return response.is_new_user;
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

      await storage.setItem('access_token', response.access_token);
      await storage.setItem('refresh_token', response.refresh_token);
      await storage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
      });
      
      return response.is_new_user;
    } finally {
      set({ isLoading: false });
    }
  },

  setCredentials: (user: User, accessToken: string, refreshToken: string) => {
    storage.setItem('access_token', accessToken);
    storage.setItem('refresh_token', refreshToken);
    storage.setItem('user', JSON.stringify(user));
    set({ user, token: accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    await storage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  selectGender: async (gender: Gender) => {
    set({ isLoading: true });
    try {
      await authApi.updateProfile({ gender });
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, gender };
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
      await storage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadAvatar: async (file: File) => {
    set({ isLoading: true });
    try {
      const { photo_url } = await authApi.uploadAvatar(file);
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
      await storage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
