import client from './client';

export interface Reel {
    id: number;
    user: number;
    video_url: string;
    caption: string;
    created_at: string;
    user_display_name: string;
    user_avatar: string;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    is_owner: boolean;
    is_archived: boolean;
}

export const reelsApi = {
    getReels: async (page: number = 1, limit: number = 10, random: boolean = false): Promise<Reel[]> => {
        const res = await client.get(`/reels/?page=${page}&limit=${limit}${random ? '&random=true' : ''}`);
        const data = res.data;
        return Array.isArray(data) ? data : (data?.results ?? []);
    },

    createReel: async (video_url: string, caption: string, visibility: string = 'all'): Promise<Reel> => {
        const res = await client.post('/reels/create/', { video_url, caption, visibility });
        return res.data;
    },

    likeReel: async (id: number): Promise<{ liked: boolean; likes_count: number }> => {
        const res = await client.post(`/reels/${id}/like/`);
        return res.data;
    },

    commentReel: async (id: number, text: string): Promise<{ success: boolean; id: number }> => {
        const res = await client.post(`/reels/${id}/comment/`, { text });
        return res.data;
    },

    getComments: async (id: number): Promise<any[]> => {
        const res = await client.get(`/reels/${id}/comments/`);
        return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    },

    shareReel: async (id: number, targetUserId: number): Promise<{ success: boolean }> => {
        const res = await client.post(`/reels/${id}/share/`, { target_user_id: targetUserId });
        return res.data;
    },
    deleteReel: async (id: number): Promise<void> => {
        await client.delete(`/reels/${id}/delete/`);
    },
};
