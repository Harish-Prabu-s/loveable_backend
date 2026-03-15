import client, { fetchWithAuth } from './client';

export interface Story {
  id: number;
  user: number;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string | null;
  is_owner: boolean;
  user_display_name: string;
  user_avatar: string;
  view_count: number;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  viewed?: boolean;
}

export const storiesApi = {
  getStories: async (): Promise<Story[]> => {
    const res = await client.get('/stories/');
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  // Alias for getStories
  list: async (): Promise<Story[]> => {
    const res = await client.get('/stories/');
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  uploadMedia: async (mediaUri: string, mediaType: 'image' | 'video' = 'image'): Promise<{ url: string }> => {
    const formData = new FormData();
    const isVideo = mediaType === 'video';

    // @ts-ignore — React Native FormData accepts objects for files
    formData.append('media', {
      uri: mediaUri,
      type: isVideo ? 'video/mp4' : 'image/jpeg',
      name: isVideo ? 'story_video.mp4' : 'story_image.jpg',
    });

    if (__DEV__) {
      console.log(`[API] Uploading story ${mediaType}:`, mediaUri);
    }

    const response = await fetchWithAuth(`stories/upload/`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  },

  createStory: async (media_url: string, media_type: string = 'image'): Promise<Story> => {
    const res = await client.post('/stories/create/', { media_url, media_type });
    return res.data;
  },

  viewStory: async (story_id: number): Promise<void> => {
    await client.post(`/stories/${story_id}/view/`);
  },

  // Alias for viewStory
  view: async (story_id: number): Promise<void> => {
    await client.post(`/stories/${story_id}/view/`);
  },

  getViews: async (story_id: number): Promise<any[]> => {
    const res = await client.get(`/stories/${story_id}/views/`);
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  getComments: async (story_id: number): Promise<any[]> => {
    const res = await client.get(`/stories/${story_id}/comments/`);
    const data = res.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  addComment: async (id: number, text: string): Promise<any> => {
    const res = await client.post(`/stories/${id}/comment/`, { text });
    return res.data;
  },

  deleteStory: async (id: number): Promise<void> => {
    await client.delete(`/stories/${id}/delete/`);
  },

  like: async (story_id: number): Promise<{ liked: boolean; likes_count: number }> => {
    const res = await client.post(`/stories/${story_id}/like/`);
    return res.data;
  },
};
