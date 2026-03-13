import apiClient from './client';

export interface Notification {
    id: number;
    type: string;
    message: string;
    is_read: boolean;
    object_id: number | null;
    created_at: string;
    actor: {
        id: number;
        display_name: string;
        photo: string | null;
    } | null;
}

export const notificationsApi = {
    getAll: async (unreadOnly = false): Promise<{ results: Notification[]; unread_count: number }> => {
        const res = await apiClient.get('notifications/', { params: unreadOnly ? { unread: 'true' } : {} });
        const data = res.data;
        const results = Array.isArray(data) ? data : (data?.results ?? []);
        const unread_count = data?.unread_count ?? results.filter((n: any) => !n.is_read).length;
        return { results, unread_count };
    },

    getUnreadCount: async (): Promise<number> => {
        const res = await apiClient.get('notifications/unread-count/');
        return res.data.unread_count;
    },

    markRead: async (ids?: number[]): Promise<void> => {
        await apiClient.post('notifications/read/', ids ? { ids } : {});
    },

    // Follow requests
    sendFollowRequest: async (userId: number): Promise<{ status: string; id: number }> => {
        const res = await apiClient.post(`notifications/follow-request/${userId}/`);
        return res.data;
    },

    respondFollowRequest: async (requestId: number, action: 'accept' | 'reject'): Promise<void> => {
        await apiClient.post(`notifications/follow-request/${requestId}/respond/`, { action });
    },

    getPendingFollowRequests: async (): Promise<{
        results: Array<{
            id: number;
            from_user: { id: number; display_name: string; photo: string | null };
            created_at: string;
        }>;
    }> => {
        const res = await apiClient.get('notifications/follow-requests/');
        const data = res.data;
        const results = Array.isArray(data) ? data : (data?.results ?? []);
        return { results };
    },

    // Settings
    getSettings: async (): Promise<{
        theme: string;
        call_preference: string;
        app_lock_type: string;
        notifications_enabled: boolean;
    }> => {
        const res = await apiClient.get('settings/');
        return res.data;
    },

    updateSettings: async (data: Partial<{
        theme: string;
        call_preference: string;
        app_lock_type: string;
        app_lock_value: string;
        notifications_enabled: boolean;
    }>): Promise<void> => {
        await apiClient.patch('settings/update/', data);
    },

    verifyLock: async (value: string): Promise<boolean> => {
        try {
            const res = await apiClient.post('settings/verify-lock/', { value });
            return res.data.valid;
        } catch {
            return false;
        }
    },

    registerPushToken: async (expo_token: string, device?: string): Promise<void> => {
        await apiClient.post('notifications/push-token/register/', { expo_token, device: device || '' });
    },
};
