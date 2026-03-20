import apiClient from './client';
import type { OTPRequest, AuthResponse, GenderSelection, User } from '@/types';
import { storage } from '@/lib/storage';

interface OTPResponse {
  message: string;
  otp?: string; // Only in development
}

export const authApi = {
  sendOTP: async (data: OTPRequest): Promise<OTPResponse> => {
    const response = await apiClient.post('auth/send-otp/', data);
    return response.data;
  },

  verifyOTP: async (data: { phone_number: string; otp_code: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('auth/verify-otp/', data);
    return response.data;
  },

  loginWithFirebase: async (data: { id_token: string; phone_number: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('auth/firebase-login/', data);
    return response.data;
  },

  loginWithMSG91: async (data: { access_token: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('auth/msg91-login/', data);
    return response.data;
  },

  sendOTPMSG91: async (phone_number: string) => {
    const response = await apiClient.post('auth/send-otp-msg91/', { phone_number });
    return response.data;
  },

  verifyOTPMSG91: async (data: { phone_number: string; otp: string }) => {
    const response = await apiClient.post('auth/verify-otp-msg91/', data);
    return response.data;
  },

  sendOTPEmail: async (email: string): Promise<OTPResponse> => {
    const response = await apiClient.post('auth/send-otp-email/', { email });
    return response.data;
  },

  verifyOTPEmail: async (data: { email: string; otp: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('auth/verify-otp-email/', data);
    return response.data;
  },

  sendOTP2Factor: async (phone_number: string): Promise<{ message: string; session_id: string; otp?: string }> => {
    const response = await apiClient.post('auth/send-otp-2factor/', { phone_number });
    return response.data;
  },

  verifyOTP2Factor: async (data: { phone_number: string; session_id: string; otp: string }): Promise<AuthResponse> => {
    const response = await apiClient.post('auth/verify-otp-2factor/', data);
    return response.data;
  },

  selectGender: async (data: GenderSelection): Promise<User> => {
    const response = await apiClient.post('auth/select-gender/', data);
    return response.data;
  },

  getUser: async (): Promise<User> => {
    const response = await apiClient.get('auth/me/');
    return response.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = await storage.getItem('refreshToken');
    if (refreshToken) {
      await apiClient.post('auth/logout/', { refresh: refreshToken });
    }
  },
  setEmail: async (email: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('auth/set-email/', { email });
    return response.data;
  },

  setLanguage: async (language: string): Promise<{ success: boolean; language: string }> => {
    const response = await apiClient.post('auth/set-language/', { language });
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ success: boolean; user: User }> => {
    const response = await apiClient.post('auth/update-profile/', data);
    return response.data;
  },

  uploadAvatar: async (uri: string): Promise<{ success: boolean; photo_url: string }> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    const response = await apiClient.post('auth/upload-avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  completeProfile: async (data: {
    email: string;
    gender: string;
    languages: string[];
    name: string;
    bio: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('auth/complete-profile/', data);
    return response.data;
  },
  getBaseUrl: () => apiClient.defaults.baseURL,
};
