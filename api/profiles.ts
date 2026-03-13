import apiClient from './client';
import type { Profile } from '@/types';

export const profilesApi = {
  getProfile: async (): Promise<Profile> => {
    const response = await apiClient.get('profiles/me/');
    return response.data;
  },

  updateProfile: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await apiClient.patch('profiles/me/', data);
    return response.data;
  },

  uploadPhoto: async (uri: string): Promise<Profile> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    // Use the specialized endpoint with filename sanitization
    await apiClient.post('auth/upload-avatar/', formData);
    // Return the updated profile
    const response = await apiClient.get('profiles/me/');
    return response.data;
  },

  getById: async (userId: number): Promise<Profile> => {
    const response = await apiClient.get(`profiles/${userId}/`);
    return response.data;
  },

  listProfiles: async (search?: string, filter?: { is_online?: boolean; is_busy?: boolean; gender?: string; language?: string }): Promise<Profile[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (filter?.is_online !== undefined) params.is_online = filter.is_online;
    if (filter?.is_busy !== undefined) params.is_busy = filter.is_busy;
    if (filter?.gender) params.gender = filter.gender;
    if (filter?.language) params.language = filter.language;
    const response = await apiClient.get('profiles/list/', { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  follow: async (userId: number): Promise<void> => {
    await apiClient.post(`profiles/${userId}/follow/`);
  },

  unfollow: async (userId: number): Promise<void> => {
    await apiClient.post(`profiles/${userId}/unfollow/`);
  },

  sendFriendRequest: async (userId: number): Promise<{ request_id: number; status: string }> => {
    const response = await apiClient.post(`profiles/${userId}/friend-request/`);
    return response.data;
  },

  respondFriendRequest: async (requestId: number, action: 'accept' | 'reject'): Promise<void> => {
    await apiClient.post(`profiles/friend-request/${requestId}/respond/`, { action });
  },

  getFollowers: async (userId: number): Promise<Profile[]> => {
    const response = await apiClient.get(`profiles/${userId}/followers/`);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  getFollowing: async (userId: number): Promise<Profile[]> => {
    const response = await apiClient.get(`profiles/${userId}/following/`);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },
};
