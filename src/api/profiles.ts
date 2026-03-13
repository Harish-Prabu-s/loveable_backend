import apiClient from './client';
import type { Profile } from '../types';

export const profilesApi = {
  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get('/profiles/me/');
    return response.data;
  },

  updateProfile: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await apiClient.patch('/profiles/me/', data);
    return response.data;
  },

  uploadPhoto: async (file: File): Promise<Profile> => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.patch('/profiles/me/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getById: async (userId: number): Promise<Profile> => {
    const response = await apiClient.get(`/profiles/${userId}/`);
    return response.data;
  },

  listProfiles: async (search?: string, filter?: { is_online?: boolean; is_busy?: boolean }): Promise<Profile[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (filter?.is_online !== undefined) params.is_online = filter.is_online;
    if (filter?.is_busy !== undefined) params.is_busy = filter.is_busy;
    const response = await apiClient.get('/profiles/list/', { params });
    return response.data;
  },

  follow: async (userId: number): Promise<void> => {
    await apiClient.post(`/profiles/${userId}/follow/`);
  },

  unfollow: async (userId: number): Promise<void> => {
    await apiClient.post(`/profiles/${userId}/unfollow/`);
  },

  sendFriendRequest: async (userId: number): Promise<{ request_id: number; status: string }> => {
    const response = await apiClient.post(`/profiles/${userId}/friend-request/`);
    return response.data;
  },

  respondFriendRequest: async (requestId: number, action: 'accept' | 'reject'): Promise<void> => {
    await apiClient.post(`/profiles/friend-request/${requestId}/respond/`, { action });
  },

  getFollowers: async (userId: number): Promise<Profile[]> => {
    const response = await apiClient.get(`/profiles/${userId}/followers/`);
    return response.data;
  },

  getFollowing: async (userId: number): Promise<Profile[]> => {
    const response = await apiClient.get(`/profiles/${userId}/following/`);
    return response.data;
  },
};
