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
}

export const reelsApi = {
    getReels: async (): Promise<Reel[]> => {
        const res = await client.get('/reels/');
        const data = res.data;
        return Array.isArray(data) ? data : (data?.results ?? []);
    },

    createReel: async (video_url: string, caption: string): Promise<Reel> => {
        const res = await client.post('/reels/create/', { video_url, caption });
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
};
