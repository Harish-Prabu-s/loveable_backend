import apiClient from './client';
import type { UserLevel, DailyReward, LeaderboardEntry, PaginatedResponse } from '@/types';

export const gamificationApi = {
  getLevel: async (): Promise<UserLevel> => {
    const response = await apiClient.get('gamification/level/');
    return response.data;
  },

  getDailyRewards: async (): Promise<DailyReward[]> => {
    const response = await apiClient.get('gamification/daily-rewards/');
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  claimDailyReward: async (day: number): Promise<DailyReward> => {
    const response = await apiClient.post(`gamification/daily-rewards/${day}/claim/`);
    return response.data;
  },

  getLeaderboard: async (): Promise<PaginatedResponse<LeaderboardEntry>> => {
    const response = await apiClient.get('gamification/leaderboard/');
    const data = response.data;
    const results = Array.isArray(data) ? data : (data?.results ?? []);
    return { ...data, results };
  },

  getStreakLeaderboard: async (): Promise<any[]> => {
    const response = await apiClient.get('leaderboard/streaks/');
    return response.data;
  },

  getVideoCallLeaderboard: async (): Promise<any[]> => {
    const response = await apiClient.get('leaderboard/video-call-time/');
    return response.data;
  },

  getAudioCallLeaderboard: async (): Promise<any[]> => {
    const response = await apiClient.get('leaderboard/audio-call-time/');
    return response.data;
  },

  getTotalCallLeaderboard: async (): Promise<any[]> => {
    const response = await apiClient.get('leaderboard/total-call-time/');
    return response.data;
  },
};
