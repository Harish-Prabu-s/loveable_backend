import apiClient from './client';
import type { Room, Message } from '@/types';

export const chatApi = {
  createRoom: async (receiver_id: number, call_type: 'audio' | 'video' = 'audio'): Promise<Room> => {
    const res = await apiClient.post('/chat/rooms/create/', { receiver_id, call_type });
    return res.data;
  },
  startCallOnRoom: async (room_id: number): Promise<Room> => {
    const res = await apiClient.post(`/chat/rooms/${room_id}/start_call/`);
    return res.data;
  },
  endCallOnRoom: async (room_id: number, duration_seconds: number, coins_spent: number): Promise<Room> => {
    const res = await apiClient.post(`/chat/rooms/${room_id}/end_call/`, { duration_seconds, coins_spent });
    return res.data;
  },
  getRooms: async (): Promise<Room[]> => {
    const res = await apiClient.get('/chat/rooms/');
    return res.data;
  },
  getMessages: async (room_id: number): Promise<Message[]> => {
    const res = await apiClient.get(`/chat/messages/${room_id}/`);
    return res.data;
  },
  sendMessage: async (room_id: number, content: string, type: 'text' | 'image' | 'audio' | 'game_invite' = 'text', media_url?: string, duration_seconds?: number): Promise<Message> => {
    const res = await apiClient.post(`/chat/messages/${room_id}/send/`, { content, type, media_url, duration_seconds });
    return res.data;
  },
  getPresence: async (user_id: number): Promise<{ status: 'busy' | 'active' }> => {
    const res = await apiClient.get(`/chat/presence/${user_id}/`);
    return res.data;
  },
  uploadMedia: async (file: File, type: 'image' | 'video' | 'voice'): Promise<{ url: string, filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const res = await apiClient.post('/uploads/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
