import apiClient from './client';

export interface CreateReportData {
  reported_user_id: number;
  reason: 'abuse' | 'nudity' | 'spam' | 'other';
  description?: string;
}

export const reportsApi = {
  createReport: async (data: CreateReportData) => {
    const response = await apiClient.post('/reports/create/', data);
    return response.data;
  },
};
