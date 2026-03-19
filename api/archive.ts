import apiClient from './client';

export type ArchiveType = 'post' | 'reel' | 'chat' | 'story';

export const archiveApi = {
    archive: async (type: ArchiveType, id: number): Promise<any> => {
        const response = await apiClient.post('archive/archive/', { type, id });
        return response.data;
    },

    unarchive: async (type: ArchiveType, id: number): Promise<any> => {
        const response = await apiClient.post('archive/unarchive/', { type, id });
        return response.data;
    },

    delete: async (type: ArchiveType, id: number): Promise<any> => {
        // Note: The backend uses DELETE method for this view
        const response = await apiClient.delete('archive/delete/', { data: { type, id } });
        return response.data;
    },

    getArchived: async (type: ArchiveType): Promise<any[]> => {
        const response = await apiClient.get(`archive/list/?type=${type}`);
        return response.data;
    }
};
