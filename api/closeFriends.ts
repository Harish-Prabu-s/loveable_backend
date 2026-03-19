import client from './client';

export interface CloseFriend {
    id: number;
    close_friend: {
        id: number;
        user_id: number;
        display_name: string;
        username: string;
        photo: string | null;
        gender: string;
    };
    created_at: string;
}

export const closeFriendsApi = {
    list: async (): Promise<CloseFriend[]> => {
        const res = await client.get('/close-friends/list/');
        return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    },

    add: async (closeFriendId: number): Promise<{ success: boolean; message: string }> => {
        const res = await client.post('/close-friends/add/', { close_friend_id: closeFriendId });
        return res.data;
    },

    remove: async (closeFriendId: number): Promise<{ success: boolean; message: string }> => {
        const res = await client.post('/close-friends/remove/', { close_friend_id: closeFriendId });
        return res.data;
    }
};
