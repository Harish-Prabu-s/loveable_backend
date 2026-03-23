import apiClient from './client';
import type { Room, Message, Contact } from '@/types';

export const chatApi = {
  createRoom: async (receiver_id: number, call_type: 'audio' | 'video' = 'audio'): Promise<Room> => {
    const res = await apiClient.post('chat/rooms/create/', { receiver_id, call_type });
    return res.data;
  },
  startCallOnRoom: async (room_id: number): Promise<Room> => {
    const res = await apiClient.post(`chat/rooms/${room_id}/start_call/`);
    return res.data;
  },
  endCallOnRoom: async (room_id: number, duration_seconds: number, coins_spent: number): Promise<Room> => {
    const res = await apiClient.post(`chat/rooms/${room_id}/end_call/`, { duration_seconds, coins_spent });
    return res.data;
  },
  getRooms: async (): Promise<Room[]> => {
    const res = await apiClient.get('chat/rooms/');
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },
  getMessages: async (room_id: number): Promise<Message[]> => {
    const res = await apiClient.get(`chat/messages/${room_id}/`);
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },
  sendMessage: async (room_id: number, content: string, type: 'text' | 'image' | 'audio' | 'video' | 'voice' | 'game_invite' | 'post_share' | 'reel_share' = 'text', media_url?: string, duration_seconds?: number): Promise<Message> => {
    const res = await apiClient.post(`chat/messages/${room_id}/send/`, { content, type, media_url, duration_seconds });
    return res.data;
  },
  getPresence: async (user_id: number): Promise<{ status: 'busy' | 'active' }> => {
    const res = await apiClient.get(`chat/presence/${user_id}/`);
    return res.data;
  },
  uploadMedia: async (file: any, type: 'image' | 'video' | 'voice'): Promise<{ url: string, filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    // Using fetch for uploads is more reliable in React Native than axios
    const { fetchWithAuth } = await import('./client');
    const response = await fetchWithAuth('uploads/', {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header; fetch will set it with the correct boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Upload Error]', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  },
  getContactList: async (): Promise<Contact[]> => {
    const res = await apiClient.get('chat/contact-list/');
    return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
  },
  toggleDisappearing: async (room_id: number, enabled: boolean, timer: number): Promise<Room> => {
    const res = await apiClient.post(`chat/rooms/${room_id}/toggle-disappearing/`, { enabled, timer });
    return res.data;
  },
  markSeen: async (room_id: number): Promise<void> => {
    await apiClient.post(`chat/messages/${room_id}/mark-seen/`);
  },
  getStreakLeaderboard: async (): Promise<any[]> => {
    const res = await apiClient.get('chat/streaks/leaderboard/');
    return res.data;
  },
};
