import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, UserPlus, MessageCircle, Video, Phone, UserCheck, MapPin, Users } from 'lucide-react';
import { profilesApi } from '../api/profiles';
import type { Profile } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useCall } from '../context/CallContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuthStore } from '../store/authStore';
import { getProfileAvatar } from '@/utils/avatar';

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const { startCall } = useCall();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userAvatarSrc = user ? getProfileAvatar(user.photo, user.id || user.phone_number || 'default', user.gender) : undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await profilesApi.listProfiles(search);
        setProfiles(data);
        // Initialize followedIds based on data if available (currently backend doesn't return list of followed IDs in listProfiles, 
        // but we can assume is_following is added to serializer in future or we fetch it separate. 
        // For now, we rely on local state or if I added is_following to ProfileSerializer (I did!))
        const following = new Set<number>();
        data.forEach(p => {
          if (p.is_following) following.add(p.user);
        });
        setFollowedIds(following);
      } catch (error) {
        console.error('Failed to load profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(load, 500); // Debounce
    return () => clearTimeout(timeout);
  }, [search]);

  const handleFollow = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    try {
      if (followedIds.has(userId)) {
        await profilesApi.unfollow(userId);
        setFollowedIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        setProfiles(prev => prev.map(p =>
          p.user === userId
            ? { ...p, followers_count: Math.max(0, (p.followers_count || 0) - 1) }
            : p
        ));
        toast.success('Unfollowed');
      } else {
        await profilesApi.follow(userId);
        setFollowedIds(prev => new Set(prev).add(userId));
        setProfiles(prev => prev.map(p =>
          p.user === userId
            ? { ...p, followers_count: (p.followers_count || 0) + 1 }
            : p
        ));
        toast.success('Followed');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen bg-gradient-to-br from-background to-background/80">
        <div className="mb-10 max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4 relative">
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              Discover People
            </h1>
            {user && (
              <div
                className="absolute right-0 cursor-pointer transition-transform hover:scale-105"
                onClick={() => navigate('/profile')}
              >
                <Avatar className="w-12 h-12 border-2 border-white shadow-lg ring-2 ring-pink-500/20">
                  <AvatarImage src={userAvatarSrc} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {(user.display_name || 'U')[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-lg mb-8">Find new friends, start conversations, and connect instantly.</p>

          <div className="relative shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl bg-card ring-1 ring-border">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-400 w-6 h-6" />
            <input
              type="text"
              placeholder="Search by name, location, or interest..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-5 rounded-2xl border-none bg-transparent focus:ring-2 focus:ring-pink-500/20 text-lg outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary"></div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">No users found</h3>
            <p className="text-muted-foreground">Try searching for something else</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-card/90 backdrop-blur-sm rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-border group cursor-pointer flex flex-col hover:-translate-y-1"
                onClick={() => navigate(`/profile/${profile.user}`)}
              >
                {/* Cover Area */}
                <div className="h-28 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {profile.is_busy ? (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1.5 z-10 border border-white/20">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      IN CALL
                    </div>
                  ) : profile.is_online ? (
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1.5 z-10 border border-white/20">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      ACTIVE
                    </div>
                  ) : null}
                </div>

                <div className="px-5 pb-5 -mt-14 flex flex-col items-center flex-1">
                  <Avatar className="w-28 h-28 border-[6px] border-white shadow-xl mb-4 bg-background ring-1 ring-border group-hover:scale-105 transition-transform duration-300">
                    <AvatarImage src={getProfileAvatar(profile.photo, profile.user, profile.gender)} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 text-3xl font-bold">
                      {(profile.display_name || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="font-bold text-lg text-foreground truncate w-full text-center mb-1">
                    {profile.display_name || `User #${profile.user}`}
                  </h3>

                  <div className="flex justify-center gap-2 mb-6 w-full px-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full max-w-[50%]">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{profile.location || 'Global'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      <Users size={12} className="shrink-0" />
                      <span>{profile.followers_count || 0}</span>
                    </div>
                  </div>

                  {/* Action Grid */}
                  <div className="grid grid-cols-4 gap-2 w-full mt-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (profile.is_busy) {
                          toast.error('User is currently in a call');
                          return;
                        }
                        startCall('video', { userId: profile.user });
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors group/btn ${profile.is_busy
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                        }`}
                    >
                      <Video size={20} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold mt-1">Video</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (profile.is_busy) {
                          toast.error('User is currently in a call');
                          return;
                        }
                        startCall('voice', { userId: profile.user });
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors group/btn ${profile.is_busy
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                        }`}
                    >
                      <Phone size={20} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold mt-1">Audio</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/chat/${profile.user}`); }}
                      className="flex flex-col items-center justify-center p-2 rounded-2xl bg-purple-50 text-purple-500 hover:bg-purple-100 transition-colors group/btn"
                    >
                      <MessageCircle size={20} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold mt-1">Chat</span>
                    </button>
                    <button
                      onClick={(e) => handleFollow(e, profile.user)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-colors group/btn ${followedIds.has(profile.user) ? 'bg-gray-100 text-gray-600' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                    >
                      {followedIds.has(profile.user) ? <UserCheck size={20} className="group-hover/btn:scale-110 transition-transform" /> : <UserPlus size={20} className="group-hover/btn:scale-110 transition-transform" />}
                      <span className="text-[10px] font-bold mt-1">{followedIds.has(profile.user) ? 'Added' : 'Follow'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
