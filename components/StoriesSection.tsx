// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, ActivityIndicator, SafeAreaView, Pressable
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';

import { storiesApi } from '@/api/stories';
import { profilesApi } from '@/api/profiles';
import { notificationsApi } from '@/api/notifications';
import * as ScreenCapture from 'expo-screen-capture';
import type { Story, StoryView } from '@/types';
import StoryComposer from './StoryComposer';
import { useAuthStore } from '@/store/authStore';

const { width, height } = Dimensions.get('window');

export default function StoriesSection() {
  const { user } = useAuthStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [viewers, setViewers] = useState<StoryView[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [showComposer, setShowComposer] = useState(false);

  const [activeStoryGroup, setActiveStoryGroup] = useState<{ userId: number, stories: Story[], currentIndex: number } | null>(null);

  useEffect(() => {
    if (user?.id) {
      profilesApi.getFollowing(user.id)
        .then(profiles => setFollowingIds(profiles.map(p => String(p.user))))
        .catch(console.error);
    }
  }, [user?.id]);

  const loadStories = async () => {
    try {
      const data = await storiesApi.list();
      setStories(data);
    } catch {
      setStories([]);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const filteredStories = useMemo(() => {
    const grouped = new Map<number, Story[]>();
    stories.forEach(s => {
      if (!grouped.has(s.user)) grouped.set(s.user, []);
      grouped.get(s.user)?.push(s);
    });

    return Array.from(grouped.entries()).map(([userId, userStories]) => {
      userStories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return {
        userId,
        userStories,
        latestStory: userStories[userStories.length - 1]
      };
    }).sort((a, b) => {
      return new Date(b.latestStory.timestamp).getTime() - new Date(a.latestStory.timestamp).getTime();
    });
  }, [stories]);

  // Auto-advance logic for story viewer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
      const isVideo = /\.(mp4|webm|mov)$/i.test(currentStory.image_url);

      if (!isVideo) {
        timer = setTimeout(() => {
          handleNextStory();
        }, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [activeStoryGroup]);

  // Record view when story opens
  useEffect(() => {
    if (activeStoryGroup && user) {
      const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
      if (currentStory.user !== user.id) {
        storiesApi.view(currentStory.id).catch(console.error);
      }

      // Privacy Protection
      ScreenCapture.preventScreenCaptureAsync();
      const subscription = ScreenCapture.addScreenshotListener(() => {
        if (currentStory.user !== user.id) {
          notificationsApi.notifyScreenshot(currentStory.user, 'story', currentStory.id)
            .catch(console.error);
        }
      });

      return () => {
        subscription.remove();
        ScreenCapture.allowScreenCaptureAsync();
      };
    }
  }, [activeStoryGroup, user, activeStoryGroup?.currentIndex]);

  const handleNextStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryGroup.currentIndex < activeStoryGroup.stories.length - 1) {
      setActiveStoryGroup({
        ...activeStoryGroup,
        currentIndex: activeStoryGroup.currentIndex + 1
      });
    } else {
      setActiveStoryGroup(null); // Close
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
      setActiveStoryGroup(null);
    }
  };

  const handleShowViews = async () => {
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

  const handleVideoStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      handleNextStory();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Stories</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Add Story Button */}
        <TouchableOpacity style={styles.storyItem} onPress={() => setShowComposer(true)}>
          <View style={[styles.avatarRing, styles.addRing]}>
            <View style={styles.addInner}>
              <MaterialCommunityIcons name="plus" size={28} color="#8B5CF6" />
            </View>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>Add Status</Text>
        </TouchableOpacity>

        {/* Story Items */}
        {filteredStories.map(({ userId, userStories, latestStory }) => {
          const isMultiple = userStories.length > 1;

          return (
            <TouchableOpacity
              key={userId}
              style={styles.storyItem}
              onPress={() => setActiveStoryGroup({ userId, stories: userStories, currentIndex: 0 })}
            >
              <View style={[styles.avatarRing, isMultiple ? styles.multipleRing : styles.singleRing]}>
                <Image
                  source={{ uri: latestStory.user_avatar || latestStory.image_url }}
                  style={styles.avatarImage}
                />
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {latestStory.user_display_name || `User #${userId}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Composer Modal */}
      {showComposer && (
        <StoryComposer
          onClose={() => setShowComposer(false)}
          onCreated={() => { setShowComposer(false); loadStories(); }}
        />
      )}

      {/* Story Viewer Overlay */}
      <Modal visible={!!activeStoryGroup} transparent animationType="fade">
        <View style={styles.viewerContainer}>
          {activeStoryGroup && (() => {
            const currentStory = activeStoryGroup.stories[activeStoryGroup.currentIndex];
            const isVideo = /\.(mp4|webm|mov)$/i.test(currentStory.image_url);

            return (
              <>
                {/* Progress Indicators */}
                <SafeAreaView style={styles.progressRow}>
                  {activeStoryGroup.stories.map((_, idx) => (
                    <View key={idx} style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, {
                        width: idx < activeStoryGroup.currentIndex ? '100%' :
                          idx === activeStoryGroup.currentIndex ? '100%' : '0%'
                      }]} />
                    </View>
                  ))}
                </SafeAreaView>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setActiveStoryGroup(null)}
                >
                  <MaterialCommunityIcons name="close" size={32} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Media */}
                <View style={styles.mediaContainer}>
                  {isVideo ? (
                    <Video
                      source={{ uri: currentStory.image_url }}
                      style={styles.media}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                      isLooping={false}
                      onPlaybackStatusUpdate={handleVideoStatusUpdate}
                    />
                  ) : (
                    <Image source={{ uri: currentStory.image_url }} style={styles.media} contentFit="contain" />
                  )}
                </View>

                {/* Tap Zones */}
                <Pressable style={[styles.tapZone, { left: 0 }]} onPress={handlePrevStory} />
                <Pressable style={[styles.tapZone, { right: 0 }]} onPress={handleNextStory} />

                {/* Footer Info */}
                <View style={styles.viewerFooter}>
                  <Text style={styles.viewerName}>
                    {currentStory.user_display_name || `User #${currentStory.user}`}
                  </Text>

                  {user && user.id === currentStory.user && (
                    <TouchableOpacity style={styles.viewCountBtn} onPress={handleShowViews}>
                      <MaterialCommunityIcons name="eye" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.viewCountText}>{currentStory.view_count || 0} Views</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            );
          })()}

          {/* Views Bottom Sheet */}
          <Modal visible={showViewers} transparent animationType="slide">
            <View style={styles.sheetOverlay}>
              <TouchableOpacity style={styles.sheetDismiss} onPress={() => setShowViewers(false)} />
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Story Views</Text>
                  <TouchableOpacity onPress={() => setShowViewers(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.sheetScroll}>
                  {viewers.length === 0 ? (
                    <View style={styles.emptyViews}>
                      <MaterialCommunityIcons name="eye-off" size={32} color="#CBD5E1" />
                      <Text style={styles.emptyViewsText}>No views yet</Text>
                    </View>
                  ) : (
                    viewers.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={styles.viewerItem}
                        onPress={() => {
                          setShowViewers(false);
                          setActiveStoryGroup(null);
                          // Need to replace this with correct router call to profile screen
                          // router.push(`/profile/${v.viewer}`); 
                        }}
                      >
                        <View style={styles.viewerAvatarBg}>
                          <Image source={{ uri: v.viewer_avatar || undefined }} style={styles.viewerAvatar} />
                        </View>
                        <View>
                          <Text style={styles.viewerItemName}>{v.viewer_name || `User #${v.viewer}`}</Text>
                          <Text style={styles.viewerItemTime}>{new Date(v.viewed_at).toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 76,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRing: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
  },
  singleRing: {
    backgroundColor: '#FACC15',
  },
  multipleRing: {
    backgroundColor: '#D946EF',
  },
  addInner: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  storyName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    marginTop: 6,
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  progressRow: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    zIndex: 50,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 50,
    padding: 8,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height,
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 0.35,
    zIndex: 40,
  },
  viewerFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  viewerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  viewCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 300,
    maxHeight: height * 0.7,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetScroll: {
    padding: 16,
  },
  emptyViews: {
    padding: 40,
    alignItems: 'center',
  },
  emptyViewsText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 15,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewerAvatarBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
    overflow: 'hidden',
  },
  viewerAvatar: {
    width: '100%',
    height: '100%',
  },
  viewerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  viewerItemTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  }
});
