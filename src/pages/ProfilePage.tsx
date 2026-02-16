import React, { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, useParams } from 'react-router-dom';
import { User, LogOut, Lock, ShieldCheck, Coins, History, Trophy, Globe2, Pencil, UserPlus, UserMinus, Gamepad2, Settings, Camera, UserCheck, Fingerprint, X, Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { notify } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PinPad from '@/components/lock/PinPad';
import PatternLock from '@/components/lock/PatternLock';
import type { CoinTransaction, Profile } from '@/types';
import { toast } from 'sonner';
import { profilesApi } from '@/api/profiles';
import { walletApi } from '@/api/wallet';

export default function ProfilePage() {
  const { user, logout, updateProfile, uploadAvatar } = useAuthStore();
  const navigate = useNavigate();
  const params = useParams();
  const viewingUserId = params.userId;
  const isOwnProfile = !viewingUserId || String(user?.id) === viewingUserId;
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isVerifyingDisable, setIsVerifyingDisable] = useState(false);
  
  // Profile State
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (viewingUserId) {
          const p = await profilesApi.getById(parseInt(viewingUserId));
          const [followers, following] = await Promise.all([
            profilesApi.getFollowers(p.user),
            profilesApi.getFollowing(p.user),
          ]);
          setViewedProfile({
            ...p,
            followers_count: followers.length,
            following_count: following.length,
          });
        } else if (user) {
          const me = await profilesApi.getProfile();
          const [followers, following] = await Promise.all([
            profilesApi.getFollowers(me.user),
            profilesApi.getFollowing(me.user),
          ]);
          setViewedProfile({
            ...me,
            followers_count: followers.length,
            following_count: following.length,
          });
        }
      } catch (error) {
        console.error(error);
        if (viewingUserId) {
          toast.error('Failed to load profile');
        }
      }
    };
    loadProfile();
  }, [viewingUserId, user?.id]);

  // Initialize state from viewed profile or user object
  useEffect(() => {
    const target = isOwnProfile ? user : viewedProfile;
    if (target) {
      setBio(target.bio || '');
      setInterests(target.interests || []);
    }
    // Email is only available on User type, not Profile
    if (user) {
      setEmail(isOwnProfile ? user.email || '' : '');
    }
  }, [user, viewedProfile, isOwnProfile]);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
      if (showFollowers && viewedProfile) {
          profilesApi.getFollowers(viewedProfile.user).then(setFollowersList).catch(console.error);
      }
  }, [showFollowers, viewedProfile]);

  useEffect(() => {
      if (showFollowing && viewedProfile) {
          profilesApi.getFollowing(viewedProfile.user).then(setFollowingList).catch(console.error);
      }
  }, [showFollowing, viewedProfile]);

  const femalePref = localStorage.getItem('female_call_pref') || 'both';
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  
  useEffect(() => {
    if (isOwnProfile) {
      walletApi.getTransactions()
        .then(data => setTransactions(data.results))
        .catch(console.error);
    }
  }, [isOwnProfile]);

  // Security Settings State
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [setupStep, setSetupStep] = useState<'select' | 'input' | 'confirm' | 'verify_old'>('select');
  const [setupMethod, setSetupMethod] = useState<'pin' | 'pattern'>('pin');
  const [tempCode, setTempCode] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      const enabled = localStorage.getItem(`user_${user.id}_app_lock_enabled`) === 'true';
      const bioPref = localStorage.getItem(`user_${user.id}_app_lock_biometric`);
      setIsLockEnabled(enabled);
      setIsBiometricEnabled(bioPref !== 'false');
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemePreference(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themePreference === 'dark') {
      root.classList.add('dark');
    } else if (themePreference === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (mq && mq.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('theme', themePreference);
    } catch {}
  }, [themePreference]);

  const handleLockToggle = (checked: boolean) => {
    if (!user?.id) return;
    
    if (!checked) {
      setIsVerifyingDisable(true);
      return;
    }

    if (checked) {
      // Check if setup exists
      const hasPin = !!localStorage.getItem(`user_${user.id}_app_lock_pin`);
      const hasPattern = !!localStorage.getItem(`user_${user.id}_app_lock_pattern`);
      
      if (!hasPin && !hasPattern) {
        setShowSecuritySettings(true);
        setSetupStep('select');
        return;
      }
    }
    
    setIsLockEnabled(checked);
    localStorage.setItem(`user_${user.id}_app_lock_enabled`, checked.toString());
    window.dispatchEvent(new Event('app_lock_changed'));
    toast.success(checked ? 'App Lock Enabled' : 'App Lock Disabled');
  };

  const toggleBiometric = () => {
    if (!user?.id) return;
    const newValue = !isBiometricEnabled;
    setIsBiometricEnabled(newValue);
    localStorage.setItem(`user_${user.id}_app_lock_biometric`, newValue.toString());
    toast.success(newValue ? 'Biometric Unlock Enabled' : 'Biometric Unlock Disabled');
  };

  const handleSetupComplete = (code: any) => {
    if (!user?.id) return;

    if (setupStep === 'verify_old') {
         const method = localStorage.getItem(`user_${user.id}_app_lock_method`);
         const savedPin = localStorage.getItem(`user_${user.id}_app_lock_pin`);
         const savedPattern = localStorage.getItem(`user_${user.id}_app_lock_pattern`);
         
         let isValid = false;
         if (method === 'pin') {
             if (code === savedPin) isValid = true;
         } else {
             // Handle pattern string/json variations
             try {
                if (JSON.stringify(code) === savedPattern || JSON.stringify(code) === JSON.stringify(JSON.parse(savedPattern || '[]'))) isValid = true;
             } catch (e) {
                if (JSON.stringify(code) === savedPattern) isValid = true;
             }
         }
         
         if (isValid) {
             setSetupStep('select'); 
             toast.success('Verified. Choose new lock method.');
         } else {
             toast.error('Incorrect code');
         }
         return;
    }

    if (setupStep === 'input') {
      setTempCode(code);
      setSetupStep('confirm');
      toast.info(`Confirm your ${setupMethod === 'pin' ? 'PIN' : 'Pattern'}`);
    } else if (setupStep === 'confirm') {
      if (JSON.stringify(code) === JSON.stringify(tempCode)) {
        // Save
        if (setupMethod === 'pin') {
          localStorage.setItem(`user_${user.id}_app_lock_pin`, code);
          localStorage.setItem(`user_${user.id}_app_lock_method`, 'pin');
          localStorage.removeItem(`user_${user.id}_app_lock_pattern`); // Clear other
        } else {
          localStorage.setItem(`user_${user.id}_app_lock_pattern`, JSON.stringify(code));
          localStorage.setItem(`user_${user.id}_app_lock_method`, 'pattern');
          localStorage.removeItem(`user_${user.id}_app_lock_pin`);
        }
        
        localStorage.setItem(`user_${user.id}_app_lock_enabled`, 'true');
        setIsLockEnabled(true);
        window.dispatchEvent(new Event('app_lock_changed'));
        setShowSecuritySettings(false);
        setTempCode(null);
        toast.success('App Lock Configured & Enabled');
      } else {
        toast.error('Code mismatch, try again');
        setSetupStep('input');
        setTempCode(null);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
        await updateProfile({ 
            bio, 
            interests, 
            email: email || undefined 
        });
        toast.success('Profile updated successfully');
    } catch (error) {
        toast.error('Failed to update profile');
        console.error(error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            await uploadAvatar(file);
            toast.success('Avatar updated');
            try {
              const me = await profilesApi.getProfile();
              const [followers, following] = await Promise.all([
                profilesApi.getFollowers(me.user),
                profilesApi.getFollowing(me.user),
              ]);
              setViewedProfile({
                ...me,
                followers_count: followers.length,
                following_count: following.length,
              });
            } catch {
            }
        } catch (error) {
            toast.error('Failed to upload avatar');
            console.error(error);
        }
    }
  };

  const sendFriendRequest = async () => {
    if (!viewedProfile) return;
    try {
        const data = await profilesApi.sendFriendRequest(viewedProfile.user);
        setViewedProfile(prev => prev ? {
            ...prev,
            friend_request_status: {
                status: 'pending',
                direction: 'sent',
                id: data.request_id
            }
        } : null);
        toast.success('Friend Request Sent');
    } catch (error) {
        toast.error('Failed to send request');
    }
  };

  const handleFriendResponse = async (action: 'accept' | 'reject') => {
    if (!viewedProfile?.friend_request_status?.id) return;
    try {
        await profilesApi.respondFriendRequest(viewedProfile.friend_request_status.id, action);
        if (action === 'accept') {
             setViewedProfile(prev => prev ? {
                ...prev,
                friend_request_status: {
                    ...prev.friend_request_status!,
                    status: 'accepted'
                },
                is_following: true,
                followers_count: (prev.followers_count || 0) + 1
            } : null);
            toast.success('Friend Request Accepted');
        } else {
             setViewedProfile(prev => prev ? {
                ...prev,
                friend_request_status: null 
            } : null);
            toast.success('Friend Request Rejected');
        }
    } catch (error) {
        toast.error('Failed to respond');
    }
  };

  const toggleFollow = async () => {
    if (!viewedProfile) return;
    const isFollowing = viewedProfile.is_following;
    try {
        if (isFollowing) {
            await profilesApi.unfollow(viewedProfile.user);
            setViewedProfile(prev => prev ? { 
                ...prev, 
                is_following: false, 
                followers_count: Math.max(0, (prev.followers_count || 0) - 1)
            } : null);
            toast.success('Unfollowed');
        } else {
            await profilesApi.follow(viewedProfile.user);
            setViewedProfile(prev => prev ? { 
                ...prev, 
                is_following: true, 
                followers_count: (prev.followers_count || 0) + 1 
            } : null);
            toast.success('Followed');
        }
    } catch (error) {
        toast.error('Failed to update follow status');
    }
  };
  const updateFemalePref = (pref: 'audio' | 'video' | 'both') => {
    localStorage.setItem('female_call_pref', pref);
    notify('success', 'PREF_UPDATED');
  };

  const handleLogout = async () => {
    await logout();
    notify('success', 'LOGOUT_SUCCESS');
    navigate('/login', { replace: true });
  };

  const displayName = isOwnProfile
    ? user?.display_name || viewedProfile?.display_name || 'My Profile'
    : viewedProfile?.display_name || (viewingUserId ? `User #${viewingUserId}` : 'User');

  const avatarSrc = isOwnProfile
    ? viewedProfile?.photo || user?.photo || (user?.phone_number ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.phone_number}` : undefined)
    : viewedProfile?.photo || (viewingUserId ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewingUserId}` : undefined);

  const avatarInitial = (displayName || 'U')[0];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6 min-h-screen">
        <div className="py-8 bg-card rounded-2xl shadow-sm mb-6 border border-border">
          <div className="flex items-center gap-4 px-6">
            <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-primary">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>{avatarInitial}</AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                    <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow cursor-pointer border border-gray-200 hover:bg-gray-50 transition-colors">
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                        />
                        <Camera className="w-3 h-3 text-gray-600" />
                    </label>
                )}
            </div>
            
            {isOwnProfile && user?.gender === 'F' && (() => {
              const lvl = parseInt(localStorage.getItem('user_level') || '1', 10) || 1;
              const hour = new Date().getHours();
              const star = lvl >= 7 && (hour >= 21 || hour < 3);
              return star;
            })() && (
              <span className="ml-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-lg">
                STAR
              </span>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe2 className="w-4 h-4" />
                <span>Language: {viewedProfile?.language || 'English'}</span>
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/wallet')}
                className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 btn-primary text-sm shadow-md"
              >
                <Coins className="w-4 h-4" />
                Wallet
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isOwnProfile && (
          <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Security & Privacy
              </h3>
              <button
                onClick={() => navigate('/account/delete')}
                className="text-xs px-3 py-1.5 rounded-lg font-bold bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors"
              >
                Delete Account
              </button>
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">App Lock</p>
                  <p className="text-xs text-muted-foreground">
                     {isLockEnabled 
                        ? `${localStorage.getItem(`user_${user?.id}_app_lock_method`) === 'pattern' ? 'Pattern' : 'PIN'} & Biometric` 
                        : 'Protect your account'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 {isLockEnabled && (
                   <>
                   <button 
                     onClick={() => { 
                       setShowSecuritySettings(true); 
                       // Check if we already have a lock set up
                       const hasPin = !!localStorage.getItem(`user_${user?.id}_app_lock_pin`);
                       const hasPattern = !!localStorage.getItem(`user_${user?.id}_app_lock_pattern`);
                       
                       if (hasPin || hasPattern) {
                         setSetupStep('verify_old');
                       } else {
                         setSetupStep('select'); 
                       }
                     }}
                     className="text-sm font-bold text-primary mr-2 hover:underline"
                   >
                     Reset Passcode
                   </button>
                   <button 
                     onClick={toggleBiometric}
                     className={`p-2 rounded-full transition-colors ${isBiometricEnabled ? 'text-primary bg-primary/10' : 'text-gray-400 hover:bg-gray-100'}`}
                     title="Biometric Unlock"
                   >
                     <Fingerprint className="w-5 h-5" />
                   </button>
                   </>
                 )}
                 <Switch 
                   checked={isLockEnabled} 
                   onCheckedChange={handleLockToggle} 
                 />
              </div>
            </div>

            <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {themePreference === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : themePreference === 'light' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <MonitorSmartphone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    {themePreference === 'dark'
                      ? 'Dark mode'
                      : themePreference === 'light'
                      ? 'Light mode'
                      : 'Follows your device setting'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThemePreference('light')}
                  className={`p-2 rounded-lg border text-xs font-semibold ${
                    themePreference === 'light'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setThemePreference('dark')}
                  className={`p-2 rounded-lg border text-xs font-semibold ${
                    themePreference === 'dark'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setThemePreference('system')}
                  className={`p-2 rounded-lg border text-xs font-semibold ${
                    themePreference === 'system'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border'
                  }`}
                >
                  <MonitorSmartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          )}

          <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button onClick={() => setShowFollowers(true)} className="text-left">
                  <p className="text-2xl font-bold text-foreground">{viewedProfile?.followers_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </button>
                <button onClick={() => setShowFollowing(true)} className="text-left">
                  <p className="text-2xl font-bold text-foreground">{viewedProfile?.following_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </button>
              </div>
              {!isOwnProfile && (
                <div className="flex gap-2">
                    {/* Friend Request Action */}
                    {viewedProfile?.friend_request_status?.status === 'pending' && viewedProfile.friend_request_status.direction === 'received' ? (
                        <div className="flex gap-1">
                            <button 
                                onClick={() => handleFriendResponse('accept')}
                                className="px-3 py-2 bg-green-500 text-white rounded-xl font-bold text-xs"
                            >
                                Accept
                            </button>
                            <button 
                                onClick={() => handleFriendResponse('reject')}
                                className="px-3 py-2 bg-red-100 text-red-500 rounded-xl font-bold text-xs"
                            >
                                Reject
                            </button>
                        </div>
                    ) : viewedProfile?.friend_request_status?.status === 'pending' && viewedProfile.friend_request_status.direction === 'sent' ? (
                        <button disabled className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold flex items-center gap-2 cursor-not-allowed">
                            <UserCheck className="w-4 h-4" />
                            Sent
                        </button>
                    ) : viewedProfile?.friend_request_status?.status === 'accepted' ? (
                         <button disabled className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            Friend
                        </button>
                    ) : (
                        <button
                          onClick={sendFriendRequest}
                          className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 transition"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Friend
                        </button>
                    )}

                    <button
                      onClick={toggleFollow}
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition ${viewedProfile?.is_following ? 'bg-gray-100 text-gray-700' : 'bg-primary text-white'}`}
                    >
                      {viewedProfile?.is_following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      {viewedProfile?.is_following ? 'Unfollow' : 'Follow'}
                    </button>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && user?.gender === 'F' && (
            <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Call Preference</h3>
              </div>
              <div className="p-4 flex gap-2">
                <button
                  onClick={() => updateFemalePref('video')}
                  className={`px-3 py-2 rounded-lg font-bold ${femalePref === 'video' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Video Only
                </button>
                <button
                  onClick={() => updateFemalePref('audio')}
                  className={`px-3 py-2 rounded-lg font-bold ${femalePref === 'audio' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Audio Only
                </button>
                <button
                  onClick={() => updateFemalePref('both')}
                  className={`px-3 py-2 rounded-lg font-bold ${femalePref === 'both' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Both
                </button>
              </div>
            </div>
          )}

          {/* League & Links */}
          <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
            <div className={`p-4 grid ${isOwnProfile ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <button
                onClick={() => navigate('/leaderboard')}
                className="w-full p-4 rounded-xl border border-border flex items-center gap-3 hover:border-primary transition bg-background/60"
              >
                <Trophy className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">League</span>
              </button>
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/wallet')}
                  className="w-full p-4 rounded-xl border border-border flex items-center gap-3 hover:border-primary transition bg-background/60"
                >
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold">Wallet</span>
                </button>
              )}
            </div>
          </div>

          {/* Bio & Interests */}
          <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Pencil className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-foreground">About</h3>
            </div>
            <div className="p-4 space-y-3">
              {isOwnProfile && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-semibold text-foreground">{user?.phone_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-input bg-background rounded-xl p-2 text-sm"
                    />
                  </div>
                </div>
              )}
              {isOwnProfile ? (
                <>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write your bio..."
                    className="w-full border border-input bg-background rounded-xl p-3 text-sm"
                  />
                  <input
                    type="text"
                    value={interests.join(', ')}
                    onChange={(e) => setInterests(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Interests (comma separated)"
                    className="w-full border border-input bg-background rounded-xl p-3 text-sm"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-primary text-white rounded-xl font-bold active:scale-95 transition"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{bio || 'No bio available'}</p>
                  <div className="flex flex-wrap gap-2">
                    {interests.length ? interests.map((i) => (
                      <span key={i} className="px-3 py-1 bg-muted rounded-full text-xs text-foreground">{i}</span>
                    )) : <span className="text-xs text-muted-foreground">No interests</span>}
                  </div>
                </>
              )}
            </div>
          </div>



          <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
            {isOwnProfile ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl transition-colors bg-destructive/10 text-destructive hover:bg-destructive/15"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            ) : (
              <p className="text-center text-xs text-gray-400">Public Profile</p>
            )}
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
                          navigate(`/profile/${p.user}`);
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
                          navigate(`/profile/${p.user}`);
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

          {/* Security Settings Modal */}
          {showSecuritySettings && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
                <h3 className="font-bold text-lg mb-6 text-center">
                  {setupStep === 'select' ? 'Choose Lock Method' : 
                   setupStep === 'confirm' ? `Confirm ${setupMethod === 'pin' ? 'PIN' : 'Pattern'}` :
                   setupStep === 'verify_old' ? 'Verify Current Password' :
                   `Set New ${setupMethod === 'pin' ? 'PIN' : 'Pattern'}`}
                </h3>
                
                {setupStep === 'select' ? (
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setSetupMethod('pin'); setSetupStep('input'); }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="bg-gray-100 p-3 rounded-full"><div className="w-6 h-6 flex items-center justify-center font-bold text-gray-700">123</div></div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">PIN Code</p>
                        <p className="text-xs text-gray-500">4-digit numeric code</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setSetupMethod('pattern'); setSetupStep('input'); }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="bg-gray-100 p-3 rounded-full"><div className="w-6 h-6 flex items-center justify-center font-bold text-gray-700">●</div></div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">Pattern</p>
                        <p className="text-xs text-gray-500">Connect the dots</p>
                      </div>
                    </button>
                  </div>
                ) : setupStep === 'verify_old' ? (
                   <div className="py-2">
                     {localStorage.getItem(`user_${user?.id}_app_lock_method`) === 'pattern' ? (
                       <PatternLock onComplete={handleSetupComplete} title="" onBack={() => { setShowSecuritySettings(false); }} />
                     ) : (
                       <PinPad onComplete={handleSetupComplete} title="" onBack={() => { setShowSecuritySettings(false); }} />
                     )}
                   </div>
                ) : (
                  <div className="py-2">
                    {setupMethod === 'pin' ? (
                      <PinPad onComplete={handleSetupComplete} title="" onBack={() => { setSetupStep('select'); setTempCode(null); }} />
                    ) : (
                      <PatternLock onComplete={handleSetupComplete} title="" onBack={() => { setSetupStep('select'); setTempCode(null); }} />
                    )}
                  </div>
                )}

                <button 
                  onClick={() => { setShowSecuritySettings(false); setSetupStep('select'); setTempCode(null); }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

      {/* Verification Modal for Disabling Lock */}
      {isVerifyingDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Verify to Disable</h3>
                  <button onClick={() => setIsVerifyingDisable(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6">
                  <p className="text-sm text-gray-500 mb-6 text-center">Enter your current PIN/Pattern to disable App Lock.</p>
                  {localStorage.getItem(`user_${user?.id}_app_lock_method`) === 'pattern' ? (
                      <PatternLock 
                         onComplete={(code) => {
                             const saved = localStorage.getItem(`user_${user?.id}_app_lock_pattern`);
                             let valid = false;
                             try {
                                if (JSON.stringify(code) === saved || JSON.stringify(code) === JSON.stringify(JSON.parse(saved || '[]'))) valid = true;
                             } catch (e) {
                                if (JSON.stringify(code) === saved) valid = true;
                             }
                             
                             if (valid) {
                                 localStorage.setItem(`user_${user?.id}_app_lock_enabled`, 'false');
                                 setIsLockEnabled(false);
                                 setIsVerifyingDisable(false);
                                 window.dispatchEvent(new Event('app_lock_changed'));
                                 toast.success('App Lock Disabled');
                             } else {
                                 toast.error('Incorrect Pattern');
                             }
                         }}
                      />
                  ) : (
                      <PinPad 
                         length={4} 
                         onComplete={(code) => {
                             const saved = localStorage.getItem(`user_${user?.id}_app_lock_pin`);
                             if (code === saved) {
                                 localStorage.setItem(`user_${user?.id}_app_lock_enabled`, 'false');
                                 setIsLockEnabled(false);
                                 setIsVerifyingDisable(false);
                                 window.dispatchEvent(new Event('app_lock_changed'));
                                 toast.success('App Lock Disabled');
                             } else {
                                 toast.error('Incorrect PIN');
                             }
                         }}
                      />
                  )}
              </div>
           </div>
        </div>
      )}
      </div>
      </div>
    </Layout>
  );
}
