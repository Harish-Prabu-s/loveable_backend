import apiClient from './client';

export const accountApi = {
  requestDeletion: async (reason: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/delete/request/', { reason });
    return response.data;
  },
  confirmDeletion: async (token: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/delete/confirm/', { token });
    return response.data;
  },
};
