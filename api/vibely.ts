import apiClient from './client';

// Monetization pricing
export const monetizationApi = {
    getRules: () => apiClient.get('/monetization/rules/').then(r => r.data),
    updateRule: (id: number, data: any) =>
        apiClient.patch(`/monetization/rules/${id}/`, data).then(r => r.data),
    getPricing: (action: string) =>
        apiClient.get(`/monetization/pricing/?action=${action}`).then(r => r.data),
};

// Calls
export const callsApi = {
    initiate: (calleeId: number, callType: 'VOICE' | 'VIDEO', roomId?: string) =>
        apiClient.post('/calls/initiate/', { callee_id: calleeId, call_type: callType, room_id: roomId }).then(r => r.data),
    accept: (sessionId: number) =>
        apiClient.post('/calls/accept/', { session_id: sessionId }).then(r => r.data),
    end: (sessionId: number) =>
        apiClient.post('/calls/end/', { session_id: sessionId }).then(r => r.data),
    getLogs: () => apiClient.get('/calls/logs/').then(r => r.data),
};

// Bet Match
export const betMatchApi = {
    create: () => apiClient.post('/betmatch/create/').then(r => r.data),
    join: (matchId: number) => apiClient.post(`/betmatch/join/${matchId}/`).then(r => r.data),
    result: (matchId: number, winnerGender: 'M' | 'F') =>
        apiClient.post(`/betmatch/result/${matchId}/`, { winner_gender: winnerGender }).then(r => r.data),
    list: (status?: string) =>
        apiClient.get(`/betmatch/list/?status=${status || 'pending'}`).then(r => {
            const data = r.data;
            return Array.isArray(data) ? data : (data?.results ?? []);
        }),
};

// League
export const leagueApi = {
    getLeaderboard: (rankBy?: string) =>
        apiClient.get(`/league/leaderboard/?rank_by=${rankBy || 'coins'}`).then(r => {
            const data = r.data;
            return {
                ...data,
                results: Array.isArray(data) ? data : (data?.results ?? [])
            };
        }),
    getMyRank: (rankBy?: string) =>
        apiClient.get(`/league/my-rank/?rank_by=${rankBy || 'coins'}`).then(r => r.data),
};
