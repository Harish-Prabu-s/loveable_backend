import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Trophy, Crown, Medal, ArrowLeft, Star, Clock, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuthStore } from '../store/authStore';
import { getProfileAvatar } from '@/utils/avatar';

type LeagueTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  appUsageMinutes: number;
  callMinutes: number;
  league: LeagueTier;
  rank: number;
}

const LEAGUES: { tier: LeagueTier; minPoints: number; color: string; icon: React.ReactNode }[] = [
  { tier: 'Master', minPoints: 50000, color: 'text-purple-500', icon: <Crown className="w-6 h-6" /> },
  { tier: 'Diamond', minPoints: 25000, color: 'text-blue-400', icon: <Star className="w-6 h-6" /> },
  { tier: 'Platinum', minPoints: 10000, color: 'text-cyan-400', icon: <Trophy className="w-6 h-6" /> },
  { tier: 'Gold', minPoints: 5000, color: 'text-yellow-400', icon: <Medal className="w-6 h-6" /> },
  { tier: 'Silver', minPoints: 1000, color: 'text-gray-400', icon: <Medal className="w-6 h-6" /> },
  { tier: 'Bronze', minPoints: 0, color: 'text-orange-700', icon: <Medal className="w-6 h-6" /> },
];

const getLeague = (points: number) => {
  return LEAGUES.find(l => points >= l.minPoints) || LEAGUES[LEAGUES.length - 1];
};

// Mock Data Generator
const generateMockLeaderboard = (): LeaderboardUser[] => {
  const users = [
    { id: '1', name: 'Priya Sharma', points: 52000, appUsageMinutes: 120, callMinutes: 300 },
    { id: '2', name: 'Anjali Gupta', points: 28000, appUsageMinutes: 90, callMinutes: 150 },
    { id: '3', name: 'Sneha Patel', points: 12000, appUsageMinutes: 60, callMinutes: 80 },
    { id: '4', name: 'Riya Singh', points: 6000, appUsageMinutes: 45, callMinutes: 40 },
    { id: '5', name: 'Neha Verma', points: 2000, appUsageMinutes: 30, callMinutes: 20 },
    { id: '6', name: 'Kavita Rao', points: 500, appUsageMinutes: 15, callMinutes: 10 },
    { id: '7', name: 'Meera Reddy', points: 45000, appUsageMinutes: 110, callMinutes: 250 },
    { id: '8', name: 'Pooja Kumar', points: 8000, appUsageMinutes: 50, callMinutes: 60 },
  ];

  // Sort by points desc
  return users.sort((a, b) => b.points - a.points).map((u, index) => ({
    ...u,
    rank: index + 1,
    league: getLeague(u.points).tier,
  }));
};

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    setUsers(generateMockLeaderboard());
  }, []);

  // Determine current user stats (mocked for demo if not in list)
  // Note: User type doesn't have 'name' property, so we display phone_number or 'You' for current user
  const currentUserStats: LeaderboardUser = {
    id: 'me',
    name: user?.phone_number || 'You', // Use phone_number since User type doesn't have 'name'
    points: 1500, // Default mock points for current user
    appUsageMinutes: 25,
    callMinutes: 15,
    rank: 99,
    league: getLeague(1500).tier
  };

  const currentLeague = getLeague(currentUserStats.points);

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-b-3xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">Leaderboard</h1>
            </div>

            {/* Current User Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary">
                    <AvatarImage src={getProfileAvatar(undefined, user?.id || user?.phone_number || 'guest', user?.gender)} />
                    <AvatarFallback>{user?.phone_number?.slice(-2) || 'G'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{user?.phone_number || 'Guest'}</p>
                    <div className={`flex items-center gap-1 text-sm font-medium ${currentLeague.color}`}>
                      {currentLeague.icon}
                      {currentLeague.tier} League
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{currentUserStats.points.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Total Points</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/20 p-2 rounded-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{currentUserStats.appUsageMinutes} min App Usage</span>
                </div>
                <div className="bg-black/20 p-2 rounded-lg flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-400" />
                  <span>{currentUserStats.callMinutes} min Calls</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-4">
          {users.map((u) => {
            const leagueInfo = getLeague(u.points);
            return (
              <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border border-gray-100">
                <div className={`font-bold text-lg w-6 text-center ${u.rank <= 3 ? 'text-yellow-500' : 'text-gray-400'}`}>
                  #{u.rank}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={getProfileAvatar(u.avatar, u.id)} />
                  <AvatarFallback>{u.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{u.name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className={leagueInfo.color}>{leagueInfo.tier}</span>
                    <span>• {u.callMinutes} min calls</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{u.points.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">Pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
