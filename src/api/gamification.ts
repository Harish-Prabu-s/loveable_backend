import apiClient from './client';
import type { UserLevel, DailyReward, LeaderboardEntry, PaginatedResponse } from '@/types';

export const gamificationApi = {
  getLevel: async (): Promise<UserLevel> => {
    const response = await apiClient.get('/gamification/level/');
    return response.data;
  },

  getDailyRewards: async (): Promise<DailyReward[]> => {
    const response = await apiClient.get('/gamification/daily-rewards/');
    return response.data;
  },

  claimDailyReward: async (day: number): Promise<DailyReward> => {
    const response = await apiClient.post(`/gamification/daily-rewards/${day}/claim/`);
    return response.data;
  },

  getLeaderboard: async (): Promise<PaginatedResponse<LeaderboardEntry>> => {
    const response = await apiClient.get('/gamification/leaderboard/');
    return response.data;
  },
};
