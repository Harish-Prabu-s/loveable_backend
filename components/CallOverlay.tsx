import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Dimensions, Animated, SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCall } from '@/context/CallContext';
import { useWalletStore } from '@/store/walletStore';
import { profilesApi } from '@/api/profiles';
import type { Profile } from '@/types';
import { RTCView } from '@/utils/webrtc';
import { useWebRTC } from '@/hooks/useWebRTC';

import ReportDialog from './ReportDialog';
import IceBreakerOverlay from './IceBreakerOverlay';
import { GiftOverlay } from './GiftOverlay';

const { width, height } = Dimensions.get('window');

export default function CallOverlay() {
  const { callState, endCall, toggleMinimize, switchCallType, incomingCall, acceptIncomingCall, rejectIncomingCall } = useCall();
  const { wallet } = useWalletStore();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [showRules, setShowRules] = useState(true);

  // Animations
  const [pulseAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (callState.isActive) {
      setShowRules(true);
      const timer = setTimeout(() => setShowRules(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [callState.isActive]);

  useEffect(() => {
    // Pulse animation for voice call avatar
    if (callState.isActive && callState.type === 'voice') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [callState.isActive, callState.type, pulseAnim]);

  useEffect(() => {
    if (callState.otherUserId) {
      profilesApi.getById(callState.otherUserId)
        .then(setOtherProfile)
        .catch(() => setOtherProfile(null));
    } else {
      setOtherProfile(null);
    }
  }, [callState.otherUserId]);

  // Hook handles connection, but rendering requires RTCView from react-native-webrtc
  const { localStream, remoteStream } = useWebRTC({
    roomId: callState.roomId,
    enabled: callState.isActive,
    kind: callState.type === "video" ? "video" : "voice",
    isCaller: callState.isCaller,
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    // Note: requires RN WebRTC stream object manipulation in real implementation
    // if (localStream) { localStream.getAudioTracks().forEach(...) }
  };

  const toggleCamera = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
  };

  const handleVideoSwitchRequest = () => {
    if (callState.type === 'voice') {
      setShowVideoConfirm(true);
    } else {
      switchCallType('voice');
    }
  };

  const confirmVideoSwitch = () => {
    switchCallType('video');
    setShowVideoConfirm(false);
  };

  const handleFollow = async () => {
    if (!callState.otherUserId) return;
    try {
      if (otherProfile?.is_following) {
        await profilesApi.unfollow(callState.otherUserId);
        setOtherProfile(prev => prev ? { ...prev, is_following: false, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
        Alert.alert('Success', 'Unfollowed');
      } else {
        await profilesApi.follow(callState.otherUserId);
        setOtherProfile(prev => prev ? { ...prev, is_following: true, followers_count: (prev.followers_count || 0) + 1 } : null);
        Alert.alert('Success', 'Followed');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callState.isActive && !incomingCall) return null;

  if (!callState.isActive && incomingCall) {
    return (
      <View style={styles.incomingOverlay}>
        <View style={styles.incomingCard}>
          <Text style={styles.incomingSubtitle}>Incoming {incomingCall.callType} call</Text>
          <Text style={styles.incomingTitle}>Someone is calling you</Text>
          <View style={styles.incomingActions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={rejectIncomingCall}>
              <MaterialCommunityIcons name="close" size={32} color="#F1F5F9" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptIncomingCall}>
              <MaterialCommunityIcons name="phone" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (callState.isMinimized) {
    return (
      <View style={styles.minimizedCard}>
        <Image
          source={{ uri: otherProfile?.photo }}
          style={styles.minimizedAvatar}
          contentFit="cover"
        />
        <View style={styles.minimizedOverlay}>
          <Text style={styles.minimizedTime}>{formatDuration(callState.duration)}</Text>
        </View>
        <TouchableOpacity style={styles.maximizeBtn} onPress={toggleMinimize}>
          <MaterialCommunityIcons name="arrow-expand" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.container}>

        {/* Top Actions */}
        <SafeAreaView style={styles.topActions}>
          <View style={{ flex: 1 }} />
          <View style={styles.topActionsRow}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => setIsGiftsOpen(true)}>
              <MaterialCommunityIcons name="gift" size={24} color="#EC4899" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => setIsGamesOpen(true)}>
              <MaterialCommunityIcons name="gamepad-variant" size={24} color="#818CF8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => setIsReportOpen(true)}>
              <MaterialCommunityIcons name="flag" size={24} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtnDark} onPress={toggleMinimize}>
              <MaterialCommunityIcons name="arrow-collapse" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Temporary Rules Popup */}
        {showRules && (
          <View style={styles.rulesPopupWrapper}>
            <View style={styles.rulesPopup}>
              <MaterialCommunityIcons name="alert" size={20} color="#FACC15" />
              <Text style={styles.rulesText}>No abuse, No nudity. Be respectful.</Text>
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {callState.type === 'video' ? (
            <View style={styles.videoBackground}>
              {/* Remote Video Stream placeholder */}
              <View style={styles.remoteVideoPlaceholder}>
                <MaterialCommunityIcons name="video" size={64} color="#334155" />
                <Text style={styles.placeholderText}>Remote Video Stream</Text>
              </View>

              {/* Local Video Stream placeholder */}
              <View style={styles.localVideoPlaceholder}>
                <MaterialCommunityIcons name="account-box" size={32} color="#334155" />
              </View>
            </View>
          ) : (
            <View style={styles.voiceBackground}>
              <View style={styles.voiceAvatarContainer}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }], opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) }]} />
                <Image source={{ uri: otherProfile?.photo }} style={styles.voiceAvatar} />
              </View>
            </View>
          )}

          {/* User Info Overlay */}
          <SafeAreaView style={styles.userInfoOverlay}>
            <View style={styles.userInfoHeader}>
              <Text style={styles.userName} numberOfLines={1}>
                {otherProfile?.display_name || `User #${callState.otherUserId || 'Unknown'}`}
              </Text>
              {otherProfile && (
                <View style={styles.followersBadge}>
                  <MaterialCommunityIcons name="account-group" size={12} color="#FFFFFF" />
                  <Text style={styles.followersText}>{otherProfile.followers_count || 0}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.followBtn, otherProfile?.is_following && styles.followBtnActive]}
              onPress={handleFollow}
            >
              <MaterialCommunityIcons name={otherProfile?.is_following ? "account-check" : "account-plus"} size={14} color={otherProfile?.is_following ? "#0F172A" : "#FFFFFF"} />
              <Text style={[styles.followBtnText, otherProfile?.is_following && styles.followBtnTextActive]}>
                {otherProfile?.is_following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <View style={styles.callStatsCard}>
              <View style={styles.statsRow}>
                <View style={styles.typeBadge}>
                  <View style={[styles.typeDot, { backgroundColor: callState.type === 'video' ? '#22C55E' : '#3B82F6' }]} />
                  <Text style={styles.typeText}>{callState.type}</Text>
                </View>
                <Text style={styles.balanceText}>Bal: {wallet?.coin_balance || 0}</Text>
              </View>
              <Text style={styles.durationText}>{formatDuration(callState.duration)}</Text>
              <Text style={styles.rateText}>{callState.costPerMinute} coins/min</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
            <MaterialCommunityIcons name={isMuted ? "microphone-off" : "microphone"} size={28} color={isMuted ? "#EF4444" : "#94A3B8"} />
          </TouchableOpacity>

          {callState.type === 'video' && (
            <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]} onPress={toggleCamera}>
              <MaterialCommunityIcons name={isCameraOff ? "video-off" : "video"} size={28} color={isCameraOff ? "#EF4444" : "#94A3B8"} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.endCallBtn} onPress={() => endCall()}>
            <MaterialCommunityIcons name="phone-hangup" size={36} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtnHighlight} onPress={() => setIsGiftsOpen(true)}>
            <MaterialCommunityIcons name="gift" size={28} color="#8B5CF6" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, callState.type === 'video' && styles.controlBtnWhite]} onPress={handleVideoSwitchRequest}>
            <MaterialCommunityIcons name="video" size={28} color={callState.type === 'video' ? "#0F172A" : "#94A3B8"} />
          </TouchableOpacity>
        </View>

        {/* Video Switch Confirmation Modal */}
        {showVideoConfirm && (
          <Modal transparent animationType="fade" visible={showVideoConfirm}>
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconBg}>
                  <MaterialCommunityIcons name="video" size={32} color="#EC4899" />
                </View>
                <Text style={styles.confirmTitle}>Switch to Video Call?</Text>
                <Text style={styles.confirmDesc}>
                  Video calls cost more coins per minute. Are you sure you want to enable video?
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setShowVideoConfirm(false)}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmAcceptBtn} onPress={confirmVideoSwitch}>
                    <Text style={styles.confirmAcceptText}>Switch</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Dialog Overlays */}
        {isReportOpen && (
          <ReportDialog
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            reportedUserId={callState.otherUserId || 0}
          />
        )}
        {isGamesOpen && (
          <IceBreakerOverlay onClose={() => setIsGamesOpen(false)} />
        )}
        {isGiftsOpen && callState.otherUserId && (
          <GiftOverlay receiverId={callState.otherUserId} onClose={() => setIsGiftsOpen(false)} />
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  incomingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 24,
  },
  incomingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  incomingSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  incomingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 32,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 24,
  },
  rejectBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedCard: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 90,
    height: 120,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  minimizedAvatar: {
    width: '100%',
    height: '100%',
  },
  minimizedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  minimizedTime: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  maximizeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 12,
  },
  topActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
  },
  topActionsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionIconBtn: {
    backgroundColor: 'rgba(255,192,203,0.2)', // Light pink tint fallback
    padding: 10,
    borderRadius: 20,
  },
  actionIconBtnDark: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 20,
  },
  rulesPopupWrapper: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  rulesPopup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  rulesText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  videoBackground: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  placeholderText: {
    color: '#64748B',
    marginTop: 12,
    fontSize: 16,
  },
  localVideoPlaceholder: {
    position: 'absolute',
    bottom: 120, // above controls
    right: 16,
    width: 100,
    height: 150,
    backgroundColor: '#334155',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  voiceBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  voiceAvatarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: '#EC4899',
  },
  voiceAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#EC4899',
    backgroundColor: '#334155',
  },
  userInfoOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 20,
    maxWidth: '60%',
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  followersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  followersText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4899',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  followBtnTextActive: {
    color: '#0F172A',
  },
  callStatsCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  balanceText: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '700',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
    marginBottom: 4,
  },
  rateText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  bottomControls: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  controlBtnWhite: {
    backgroundColor: '#FFFFFF',
  },
  controlBtnHighlight: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  confirmIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  confirmAcceptBtn: {
    flex: 1,
    backgroundColor: '#EC4899',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmAcceptText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  }
});
