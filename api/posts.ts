import apiClient, { fetchWithAuth } from './client';
import { ensureHttps } from '@/utils/url';

export interface Post {
    id: number;
    user: number;
    profile_id: number;
    display_name: string;
    username: string;
    photo: string | null;
    gender: string;
    caption: string;
    image: string | null;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    is_owner: boolean;
    created_at: string;
}

export const postsApi = {
    /** Fetch the home feed — paginated, newest first */
    getFeed: async (): Promise<Post[]> => {
        const response = await apiClient.get('posts/feed/');
        const data = response.data;
        const list: Post[] = Array.isArray(data) ? data : (data?.results ?? []);
        // Upgrade all image URLs to HTTPS
        return list.map((p) => ({
            ...p,
            image: ensureHttps(p.image) ?? null,
            photo: ensureHttps(p.photo) ?? null,
        }));
    },

    /** Create a new post with optional image upload */
    createPost: async (caption: string, imageUri?: string): Promise<Post> => {
        const formData = new FormData();
        formData.append('caption', caption);
        if (imageUri) {
            // @ts-ignore — React Native FormData accepts objects for files
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'post_image.jpg',
            });
        }

        if (__DEV__) {
            console.log('[API] Creating post with image:', imageUri);
        }

        const response = await fetchWithAuth(`posts/`, {
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

        const p: Post = await response.json();
        return {
            ...p,
            image: ensureHttps(p.image) ?? null,
            photo: ensureHttps(p.photo) ?? null,
        };
    },

    /** Like / Unlike a post */
    toggleLike: async (postId: number): Promise<{ is_liked: boolean; likes_count: number }> => {
        const response = await apiClient.post(`posts/${postId}/like/`);
        return response.data;
    },

    /** Delete a post */
    deletePost: async (postId: number): Promise<void> => {
        await apiClient.delete(`posts/${postId}/`);
    },

    /** Get comments for a post */
    getComments: async (postId: number): Promise<any[]> => {
        const response = await apiClient.get(`posts/${postId}/comments/`);
        return Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
    },

    /** Add a comment to a post */
    addComment: async (postId: number, text: string): Promise<any> => {
        const response = await apiClient.post(`posts/${postId}/comment/`, { text });
        return response.data;
    },

    /** Share a post with a friend */
    sharePost: async (postId: number, targetUserId: number): Promise<{ success: boolean }> => {
        const response = await apiClient.post(`posts/${postId}/share/`, { target_user_id: targetUserId });
        return response.data;
    },
};
