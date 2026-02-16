import apiClient from './client';
import type { Story, StoryView } from '@/types';

export const storiesApi = {
  list: async (): Promise<Story[]> => {
    const res = await apiClient.get('/stories/');
    return res.data;
  },
  create: async (image_url: string): Promise<Story> => {
    const res = await apiClient.post('/stories/create/', { image_url });
    return res.data;
  },
  uploadMedia: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('media', file);
    const res = await apiClient.post('/stories/upload/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  view: async (storyId: number): Promise<void> => {
    await apiClient.post(`/stories/${storyId}/view/`);
  },
  getViews: async (storyId: number): Promise<StoryView[]> => {
    const res = await apiClient.get(`/stories/${storyId}/views/`);
    return res.data;
  },
};
