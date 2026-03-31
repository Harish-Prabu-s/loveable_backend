import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { storiesApi } from '../api/stories';
import { profilesApi } from '../api/profiles';
import type { Story, StoryView } from '../types';
import StoryComposer from './StoryComposer';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

// Backend-powered list

export default function StoriesSection() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [viewers, setViewers] = useState<StoryView[]>([]);
  const [showViewers, setShowViewers] = useState(false);

  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      profilesApi.getFollowing(user.id)
        .then(profiles => setFollowingIds(profiles.map(p => String(p.user))))
        .catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await storiesApi.list();
        setStories(data);
      } catch {
        setStories([]);
      }
    };
    load();
  }, []);
  const filteredStories = useMemo(() => {
    // Show all stories for "Vibe Check" (Discovery mode)
    // Prioritize following + self in sorting if needed, but for now show all
    const relevant = stories;

    // Group by user
    const grouped = new Map<number, Story[]>();
    relevant.forEach(s => {
        if (!grouped.has(s.user)) {
            grouped.set(s.user, []);
        }
        grouped.get(s.user)?.push(s);
    });
    
    // Sort grouped stories by newest first
    return Array.from(grouped.entries()).map(([userId, userStories]) => {
        // Sort stories for this user by time
        userStories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return {
            userId,
            userStories,
            latestStory: userStories[userStories.length - 1]
        };
    }).sort((a, b) => {
        // Sort users by latest story timestamp
        return new Date(b.latestStory.timestamp).getTime() - new Date(a.latestStory.timestamp).getTime();
    });
  }, [stories]);

  const [activeStoryGroup, setActiveStoryGroup] = useState<{ userId: number, stories: Story[], currentIndex: number } | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const handleAddStory = () => setShowComposer(true);
  const refreshStories = async () => {
    const data = await storiesApi.list();
    setStories(data);
  };

  // Auto-advance logic for story viewer
  useEffect(() => {
      let timer: NodeJS.Timeout;
      if (activeStoryGroup) {
          const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
          const isVideo = /\.(mp4|webm|mov)$/i.test(currentStory.image_url);
          
          if (!isVideo) {
              // Auto advance photos after 5 seconds
              timer = setTimeout(() => {
                  handleNextStory();
              }, 5000);
          }
      }
      return () => clearTimeout(timer);
  }, [activeStoryGroup]);

  const handleNextStory = () => {
      if (!activeStoryGroup) return;
      
      if (activeStoryGroup.currentIndex < activeStoryGroup.stories.length - 1) {
          // Next story in same group
          setActiveStoryGroup({
              ...activeStoryGroup,
              currentIndex: activeStoryGroup.currentIndex + 1
          });
      } else {
          // Close viewer (or could move to next user)
          setActiveStoryGroup(null);
      }
  };

  const handlePrevStory = () => {
      if (!activeStoryGroup) return;
      
      if (activeStoryGroup.currentIndex > 0) {
          setActiveStoryGroup({
              ...activeStoryGroup,
              currentIndex: activeStoryGroup.currentIndex - 1
          });
      } else {
          // Close viewer
          setActiveStoryGroup(null);
      }
  };

  // Record view when story opens
  useEffect(() => {
    if (activeStoryGroup && user) {
        const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
        if (currentStory.user !== user.id) {
            storiesApi.view(currentStory.id).catch(console.error);
        }
    }
  }, [activeStoryGroup, user]);

  const handleShowViews = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeStoryGroup) return;
    const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
    try {
      const data = await storiesApi.getViews(currentStory.id);
      setViewers(data);
      setShowViewers(true);
    } catch (error) {
      console.error('Failed to load views', error);
    }
  };

  return (
    <div className="py-4">
      <h3 className="text-lg font-semibold px-4 mb-2">Stories</h3>
      <div className="flex overflow-x-auto px-4 gap-4 pb-2 scrollbar-hide">
        {/* Add Story Button */}
        <div className="flex flex-col items-center space-y-1 min-w-[70px]">
          <button 
            onClick={handleAddStory}
            className="w-16 h-16 rounded-full border-2 border-dashed border-primary flex items-center justify-center bg-gray-50"
          >
            <Plus className="w-6 h-6 text-primary" />
          </button>
          <span className="text-xs font-medium">Add Status</span>
        </div>

        {/* Story Items (Grouped by User) */}
        {filteredStories.map(({ userId, userStories, latestStory }) => (
          <div 
            key={userId} 
            className="flex flex-col items-center space-y-1 min-w-[70px] cursor-pointer"
            onClick={() => setActiveStoryGroup({ userId, stories: userStories, currentIndex: 0 })}
          >
            {/* Ring with segments indicating count (simplified as gradient for now) */}
            <div className={`w-16 h-16 rounded-full p-[2px] ${userStories.length > 1 ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500' : 'bg-gradient-to-tr from-yellow-400 to-primary'}`}>
              <Avatar className="w-full h-full border-2 border-white">
                <AvatarImage src={latestStory.user_avatar || latestStory.image_url} className="object-cover" />
                <AvatarFallback>{(latestStory.user_display_name || 'U')[0]}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs font-medium truncate w-16 text-center">{latestStory.user_display_name || `User #${userId}`}</span>
          </div>
        ))}
      </div>

      {showComposer && (
        <StoryComposer onClose={() => setShowComposer(false)} onCreated={refreshStories} />
      )}

      {/* Story Viewer Overlay */}
      {activeStoryGroup && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Progress Bar */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-50">
             {activeStoryGroup.stories.map((_, idx) => (
                 <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                     <div 
                        className={`h-full bg-white transition-all duration-300 ${idx < activeStoryGroup.currentIndex ? 'w-full' : idx === activeStoryGroup.currentIndex ? 'w-full animate-progress' : 'w-0'}`}
                     />
                 </div>
             ))}
          </div>

          <button 
            onClick={() => setActiveStoryGroup(null)}
            className="absolute top-8 right-4 text-white p-2 z-50"
          >
            <X className="w-8 h-8" />
          </button>
          
          {/* Navigation Tap Zones */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-40" onClick={handlePrevStory}></div>
          <div className="absolute inset-y-0 right-0 w-1/3 z-40" onClick={handleNextStory}></div>

          {(() => {
            const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
            
            // 🔒 Protocol Fixer for individual stories
            const secureMediaUrl = currentStory.image_url && currentStory.image_url.startsWith('http://') 
                ? currentStory.image_url.replace('http://', 'https://') 
                : currentStory.image_url;

            const isVideo = /\.(mp4|webm|mov)$/i.test(secureMediaUrl);

            return (
                <>
                  {isVideo ? (
                    <video 
                        key={secureMediaUrl} // Force re-mount on URL change
                        src={secureMediaUrl} 
                        playsInline
                        webkit-playsinline="true"
                        preload="auto"
                        controls={false}
                        autoPlay 
                        muted={false} // Stories usually have sound
                        onEnded={handleNextStory}
                        className="max-h-screen max-w-full object-contain" 
                        onError={(e) => {
                            console.error("Video play error", e);
                        }}
                    />
                  ) : (
                    <img 
                      src={secureMediaUrl} 
                      alt="Story" 
                      className="max-h-screen max-w-full object-contain"
                      onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-media.png'; // Fallback
                      }}
                    />
                  )}
                  
                  <div className="absolute bottom-10 left-0 right-0 text-center text-white z-50 pointer-events-none">
                    <h3 className="text-xl font-bold">{currentStory.user_display_name || `User #${currentStory.user}`}</h3>
                    
                    {user && user.id === currentStory.user && (
                       <button 
                         onClick={handleShowViews}
                         className="mt-2 flex items-center justify-center space-x-2 mx-auto bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm hover:bg-black/60 transition-colors pointer-events-auto"
                       >
                         <Eye className="w-4 h-4 text-white" />
                         <span className="text-sm text-white">{currentStory.view_count || 0} Views</span>
                       </button>
                    )}
                  </div>
                </>
            );
          })()}

          {showViewers && (
            <div className="absolute inset-0 z-[60] bg-white text-black flex flex-col mt-20 rounded-t-2xl animate-in slide-in-from-bottom">
               <div className="flex justify-between items-center p-4 border-b">
                 <h3 className="font-semibold text-lg">Story Views</h3>
                 <button onClick={(e) => { e.stopPropagation(); setShowViewers(false); }}>
                   <X className="w-6 h-6" />
                 </button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {viewers.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                     <Eye className="w-8 h-8 mb-2 opacity-50" />
                     <p>No views yet</p>
                   </div>
                 ) : (
                   viewers.map((v) => (
                     <div 
                        key={v.id} 
                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${v.viewer}`);
                        }}
                     >
                        <Avatar>
                          <AvatarImage src={v.viewer_avatar || undefined} />
                          <AvatarFallback>{(v.viewer_name || 'U')[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{v.viewer_name || `User #${v.viewer}`}</p>
                          <p className="text-xs text-gray-500">{new Date(v.viewed_at).toLocaleString()}</p>
                        </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
