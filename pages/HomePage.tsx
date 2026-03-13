import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { profilesApi } from '@/api/profiles';
import { walletApi } from '@/api/wallet';
import { gamificationApi } from '@/api/gamification';
import type { Profile, Wallet, UserLevel } from '@/types';
import { Coins, Video, Mic, Radio, Phone, Sparkles, MessageCircle, Trophy, ChevronRight, Frown, Meh, Smile, HeartHandshake, Coffee, Zap, Users, UserCheck } from 'lucide-react';
import { notify, notifyTimeSlotOncePerDay } from '@/lib/utils';
import { toast } from 'sonner';
import StoriesSection from '@/components/StoriesSection';
import { useCall } from '@/context/CallContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from '@/lib/avatars';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { startCall } = useCall();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [recommendedUsers, setRecommendedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);

  const femalePref = localStorage.getItem('female_call_pref') || 'both';

  // Redirect to gender page if gender not selected
  useEffect(() => {
    if (user && user.gender === null) {
      router.replace('/gender');
    }
  }, [user, router]);

  // Load all data safely
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [profileData, walletData, levelData, usersData] = await Promise.all([
          profilesApi.getProfile().catch((err: any) => {
            console.error('Profile load error:', err);
            return null;
          }),
          walletApi.getWallet().catch((err: any) => {
            console.error('Wallet load error:', err);
            return null;
          }),
          gamificationApi.getLevel().catch((err: any) => {
            console.error('Level load error:', err);
            return null;
          }),
          profilesApi.listProfiles().catch((err: any) => {
            console.error('List profiles error:', err);
            return [];
          }),
        ]);

        setProfile(profileData);
        setWallet(walletData);
        setLevel(levelData);
        setRecommendedUsers(usersData || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Time-based Tanglish notifications
  useEffect(() => {
    notifyTimeSlotOncePerDay();
  }, []);

  // League Calculation
  const getLeagueInfo = (xp: number) => {
    if (xp >= 50000) return { tier: 'Master', color: 'text-purple-500', bg: 'bg-purple-500', min: 50000, next: 100000 };
    if (xp >= 25000) return { tier: 'Diamond', color: 'text-blue-400', bg: 'bg-blue-400', min: 25000, next: 50000 };
    if (xp >= 10000) return { tier: 'Platinum', color: 'text-cyan-400', bg: 'bg-cyan-400', min: 10000, next: 25000 };
    if (xp >= 5000) return { tier: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-400', min: 5000, next: 10000 };
    if (xp >= 1000) return { tier: 'Silver', color: 'text-gray-400', bg: 'bg-gray-400', min: 1000, next: 5000 };
    return { tier: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-600', min: 0, next: 1000 };
  };

  const currentXP = level?.xp || 1500;
  const league = getLeagueInfo(currentXP);
  const leagueProgress = Math.min(((currentXP - league.min) / (league.next - league.min)) * 100, 100);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-pink-500 mx-auto"></div>
        </div>
      </Layout>
    );
  }

  const moods = [
    { icon: Frown, label: 'Lonely', color: 'bg-purple-100 text-purple-600' },
    { icon: Coffee, label: 'Bored', color: 'bg-orange-100 text-orange-600' },
    { icon: HeartHandshake, label: 'Need Advice', color: 'bg-yellow-100 text-yellow-600' },
    { icon: Smile, label: 'Happy', color: 'bg-green-100 text-green-600' },
    { icon: Zap, label: 'Stressed', color: 'bg-red-100 text-red-600' },
    { icon: MessageCircle, label: 'Just Talk', color: 'bg-blue-100 text-blue-600' },
  ];

  const handleFollowersClick = async () => {
    if (!profile) return;
    try {
      const data = await profilesApi.getFollowers(profile.user);
      setFollowersList(data);
      setShowFollowers(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load followers');
    }
  };

  const handleFollowingClick = async () => {
    if (!profile) return;
    try {
      const data = await profilesApi.getFollowing(profile.user);
      setFollowingList(data);
      setShowFollowing(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load following');
    }
  };

  return (
    <Layout>
      <div className="pb-24 min-h-screen font-sans selection:bg-pink-100 bg-background text-foreground">

        {/* Hero / Header Section - Unified Gradient Theme */}
        <div className="relative bg-gradient-primary p-6 pb-16 rounded-b-[3rem] shadow-2xl shadow-pink-500/20 text-white overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-60 animate-pulse"></div>
          <div className="absolute bottom-[-30px] left-[-30px] w-48 h-48 bg-purple-500/20 rounded-full blur-3xl mix-blend-overlay"></div>
          <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/20 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Hi, {profile?.display_name || 'Friend'}! ✨</h1>
              <p className="text-white/90 text-lg font-medium">Ready to connect?</p>
              <div className="flex gap-4 mt-3 text-white/80 text-sm font-bold">
                <button
                  type="button"
                  onClick={handleFollowersClick}
                  className="backdrop-blur-md bg-white/10 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 hover:bg-white/20 active:scale-95 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  {profile?.followers_count || 0} Followers
                </button>
                <button
                  type="button"
                  onClick={handleFollowingClick}
                  className="backdrop-blur-md bg-white/10 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 hover:bg-white/20 active:scale-95 transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {profile?.following_count || 0} Following
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/wallet')}
              className="bg-white/25 backdrop-blur-xl px-4 py-2.5 rounded-2xl flex items-center border border-white/40 shadow-lg shadow-black/5 hover:bg-white/40 active:scale-95 transition"
            >
              <Coins className="w-5 h-5 text-yellow-300 mr-2 drop-shadow-md" />
              <span className="font-bold text-white text-lg tracking-wide">{wallet?.coin_balance ?? 0}</span>
            </button>
          </div>
        </div>

        {/* Mood Grid - Floating Cards with Glassmorphism */}
        <div className="px-5 -mt-10 relative z-20">
          <div className="bg-card/95 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-xl shadow-indigo-500/20 border border-border">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 text-center">How are you feeling?</h2>
            <div className="grid grid-cols-2 gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.label}
                  onClick={() => {
                    toast.success(`Finding someone to talk about feeling ${mood.label}...`);
                    startCall('voice');
                  }}
                  className="flex items-center p-3.5 rounded-2xl bg-background hover:bg-muted transition-all duration-300 border border-transparent hover:border-pink-200 active:scale-95 group shadow-sm hover:shadow-md"
                >
                  <div className={`p-3 rounded-full ${mood.color} mr-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <mood.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-foreground text-sm">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main CTA: Find a Voice Friend */}
        <div className="px-5 mt-8">
          <div className="bg-card rounded-[2rem] p-6 shadow-lg shadow-pink-500/20 border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -z-10"></div>
            <h3 className="font-bold text-foreground mb-1 text-xl">Find a Voice Friend</h3>
            <p className="text-sm text-muted-foreground mb-5">Connecting you with someone who understands...</p>

            <button
              onClick={() => startCall('voice')}
              className="w-full btn-primary text-xl flex items-center justify-between px-8 py-5 shadow-xl shadow-pink-500/50 active:scale-95 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  <Mic className="w-6 h-6 animate-pulse text-white" />
                </div>
                <span>Start Voice Chat</span>
              </div>
              <ChevronRight className="w-6 h-6 opacity-80 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Quick Connect / New Users */}
        <div className="px-5 mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-foreground text-xl tracking-tight">New People</h3>
            <button className="text-pink-500 text-sm font-bold hover:text-pink-400 transition-colors" onClick={() => router.push('/discover')}>See All</button>
          </div>

          <div className="flex overflow-x-auto gap-5 pb-6 no-scrollbar snap-x">
            {recommendedUsers.length === 0 ? (
              <div className="w-full text-center py-4 text-muted-foreground text-sm">No new people found</div>
            ) : recommendedUsers.map((p) => (
              <div key={p.id} onClick={() => router.push(`/profile/${p.user}`)} className="min-w-[110px] snap-start flex flex-col items-center group cursor-pointer">
                <div className="relative mb-3 transition-transform duration-300 group-hover:scale-105">
                  <div className="p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 shadow-md">
                    <Avatar className="w-20 h-20 border-[3px] border-white">
                      <AvatarImage src={p.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user}`} className="object-cover" />
                      <AvatarFallback>{(p.display_name || 'U')[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className={`absolute bottom-1 right-1 w-5 h-5 border-[3px] border-white rounded-full ${p.is_busy ? 'bg-red-500' : p.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                </div>
                <p className="text-sm font-bold text-foreground mb-1 truncate w-full text-center px-1">{p.display_name || `User #${p.user}`}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.is_busy) {
                      toast.error('User is currently in a call');
                      return;
                    }
                    startCall('voice', { userId: p.user });
                  }}
                  className={`text-[11px] font-bold px-4 py-1.5 rounded-full transition-colors shadow-sm ${p.is_busy
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                    }`}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Stories Section (Integrated) */}
        <div className="mt-2 bg-card py-6 shadow-sm border-y border-border">
          <div className="px-5 mb-3">
            <h3 className="font-extrabold text-foreground text-xl tracking-tight">Vibe Check</h3>
          </div>
          <StoriesSection />
        </div>

        {/* League / Gamification */}
        <div
          onClick={() => router.push('/leaderboard')}
          className="mx-5 mt-8 mb-8 bg-gradient-to-r from-[#2C3E50] to-[#000000] rounded-3xl p-6 text-white shadow-2xl shadow-gray-400/50 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className={`w-6 h-6 text-yellow-400 drop-shadow-md`} />
                <span className="font-bold text-xl">{league.tier} League</span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full mb-3 overflow-hidden backdrop-blur-sm">
                <div className={`h-full ${league.bg} shadow-[0_0_10px_rgba(255,255,255,0.5)]`} style={{ width: `${leagueProgress}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">{currentXP} / {league.next} XP to Rank Up</p>
            </div>
            <div className="bg-white/10 p-3 rounded-full ml-4 backdrop-blur-md border border-white/10">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {showFollowers && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl w-full max-w-md p-4 border border-border">
              <h3 className="font-bold mb-3 text-foreground">Followers</h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {followersList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No followers yet</p>
                ) : (
                  followersList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        router.push(`/profile/${p.user}`);
                        setShowFollowers(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/60"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={p.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user}`}
                          className="object-cover"
                        />
                        <AvatarFallback>{(p.display_name || 'U')[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {p.display_name || `User #${p.user}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowFollowers(false)}
                className="mt-4 w-full bg-primary text-primary-foreground rounded-xl py-2 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showFollowing && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl w-full max-w-md p-4 border border-border">
              <h3 className="font-bold mb-3 text-foreground">Following</h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {followingList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Not following anyone</p>
                ) : (
                  followingList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        router.push(`/profile/${p.user}`);
                        setShowFollowing(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/60"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={p.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user}`}
                          className="object-cover"
                        />
                        <AvatarFallback>{(p.display_name || 'U')[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {p.display_name || `User #${p.user}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowFollowing(false)}
                className="mt-4 w-full bg-primary text-primary-foreground rounded-xl py-2 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
