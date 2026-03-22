import apiClient from './client';
import type { Profile, StreakUpload, StreakComment } from '@/types';

export interface Streak {
  streak_id: number;
  friend: Profile;
  streak_count: number;
  last_interaction_date: string;
  freezes_available: number;
}

export const streaksApi = {
  getStreaks: async (): Promise<Streak[]> => {
    const response = await apiClient.get('streaks/');
    return response.data;
  },

  uploadStreak: async (params: {
    media: any;
    media_type: 'image' | 'video';
    visibility: 'all' | 'close_friends';
  }): Promise<{ message: string; upload_id: number }> => {
    const formData = new FormData();
    formData.append('media_type', params.media_type);
    formData.append('visibility', params.visibility);
    
    // @ts-ignore
    formData.append('media', {
      uri: params.media.uri,
      type: params.media_type === 'image' ? 'image/jpeg' : 'video/mp4',
      name: params.media_type === 'image' ? 'streak.jpg' : 'streak.mp4',
    });

    const response = await apiClient.post('streaks/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getLeaderboard: async (): Promise<any[]> => {
    const response = await apiClient.get('streaks/leaderboard/');
    return response.data;
  },

  getUpload: async (id: number): Promise<StreakUpload> => {
    const response = await apiClient.get(`streaks/${id}/`);
    return response.data;
  },

  listComments: async (uploadId: number): Promise<StreakComment[]> => {
    const response = await apiClient.get(`streaks/${uploadId}/comments/`);
    return response.data;
  },

  addComment: async (uploadId: number, text: string): Promise<any> => {
    const response = await apiClient.post(`streaks/${uploadId}/comment/`, { text });
    return response.data;
  },

  getSnapchatStreaks: async (type: 'friends' | 'all' = 'friends'): Promise<any[]> => {
    const response = await apiClient.get(`streaks/view/`, { params: { type } });
    return response.data;
  },
  
  toggleLike: async (uploadId: number): Promise<{ liked: boolean }> => {
    const response = await apiClient.post(`streaks/${uploadId}/like/`);
    return response.data;
  },

  toggleFire: async (uploadId: number): Promise<{ fired: boolean }> => {
    const response = await apiClient.post(`streaks/${uploadId}/fire/`);
    return response.data;
  },
};
