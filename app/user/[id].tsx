import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getMediaUrl } from '@/utils/media';
import { profilesApi } from '@/api/profiles';
import { generateAvatarUrl } from '@/utils/avatar';

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                if (!id) return;
                const data = await profilesApi.getById(Number(id));
                setProfile(data);
                // If the backend doesn't return `is_following`, we default to false for now
                setIsFollowing(data.is_following || false);
            } catch (error) {
                console.error('Failed to load public profile:', error);
                Alert.alert('Error', 'Failed to load user profile.');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [id]);

    const handleFollowToggle = async () => {
        if (!profile) return;
        const previousFollowing = isFollowing;
        const previousFollowersCount = profile.followers_count || 0;

        try {
            console.log(`[Follow] Toggling follow for user ${profile.user}. Current state: ${isFollowing}`);

            // 1. Optimistic UI update
            if (isFollowing) {
                setIsFollowing(false);
                setProfile((prev: any) => ({
                    ...prev,
                    followers_count: Math.max(0, previousFollowersCount - 1)
                }));
                DeviceEventEmitter.emit('profile:following_changed', -1);
            } else {
                setIsFollowing(true);
                setProfile((prev: any) => ({
                    ...prev,
                    followers_count: previousFollowersCount + 1
                }));
                DeviceEventEmitter.emit('profile:following_changed', 1);
            }

            // 2. API call
            if (previousFollowing) {
                await profilesApi.unfollow(profile.user);
                console.log('[Follow] Unfollow API success');
            } else {
                await profilesApi.follow(profile.user);
                console.log('[Follow] Follow API success');
            }

            // 3. Silent refetch to sync final state
            const updatedData = await profilesApi.getById(Number(id));
            setProfile(updatedData);
            setIsFollowing(updatedData.is_following || false);
            console.log('[Follow] State synced with backend');

        } catch (error) {
            console.error('Failed to update follow status:', error);
            // Revert optimistic update
            setIsFollowing(previousFollowing);
            setProfile((prev: any) => ({ ...prev, followers_count: previousFollowersCount }));
            Alert.alert('Error', 'Failed to update follow status.');
        }
    };

    const handleFriendRequest = async () => {
        if (!profile) return;
        try {
            await profilesApi.sendFriendRequest(profile.user);
            Alert.alert('Success', 'Friend request sent!');
        } catch (error) {
            console.error('Failed to send friend request:', error);
            Alert.alert('Error', 'Could not send friend request.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: '#F1F5F9' }}>User not found.</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#8B5CF6' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <LinearGradient
                    colors={['#8B5CF6', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    {/* Back Button */}
                    <View style={styles.headerNav}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{
                                    uri: profile.photo
                                        ? (getMediaUrl(profile.photo) || generateAvatarUrl(profile.id, profile.gender))
                                        : generateAvatarUrl(profile.id, profile.gender)
                                }}
                                style={styles.avatar}
                            />
                            {profile.is_online && <View style={styles.onlineStatus} />}
                        </View>
                        <Text style={styles.name}>{profile.display_name || 'User'}</Text>
                        <Text style={styles.username}>@{profile.username || 'username'}</Text>

                        {profile.bio ? (
                            <Text style={styles.bio}>{profile.bio}</Text>
                        ) : null}
                    </View>

                    <View style={styles.statsContainer}>
                        <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/network/followers?userId=${profile.user}` as any)}>
                            <Text style={styles.statNumber}>{profile.followers_count || 0}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/network/following?userId=${profile.user}` as any)}>
                            <Text style={styles.statNumber}>{profile.following_count || 0}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.contentContainer}>
                    {/* Interaction Actions */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, isFollowing ? styles.followingBtn : styles.followBtn]}
                            onPress={handleFollowToggle}
                        >
                            <MaterialCommunityIcons name={isFollowing ? "account-check" : "account-plus"} size={20} color={isFollowing ? "#8B5CF6" : "#FFFFFF"} />
                            <Text style={[styles.actionBtnText, isFollowing && styles.followingBtnText]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.friendRequestBtn]}
                            onPress={handleFriendRequest}
                        >
                            <MaterialCommunityIcons name="account-heart" size={20} color="#3B82F6" />
                            <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Add Friend</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dividerH} />
                    <Text style={styles.sectionTitle}>Communicate</Text>

                    <View style={styles.commGrid}>
                        <TouchableOpacity
                            style={styles.commCard}
                            onPress={() => router.push({
                                pathname: '/call/[id]' as any,
                                params: { id: profile.user, mode: 'audio' },
                            })}
                        >
                            <View style={[styles.commIconBg, { backgroundColor: '#FEE2E2' }]}>
                                <MaterialCommunityIcons name="phone" size={28} color="#EF4444" />
                            </View>
                            <Text style={styles.commLabel}>Audio Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.commCard}
                            onPress={() => router.push({
                                pathname: '/call/[id]' as any,
                                params: { id: profile.user, mode: 'video' },
                            })}
                        >
                            <View style={[styles.commIconBg, { backgroundColor: '#E0E7FF' }]}>
                                <MaterialCommunityIcons name="video" size={28} color="#6366F1" />
                            </View>
                            <Text style={styles.commLabel}>Video Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.commCard} onPress={() => router.push(`/chat/${profile.user}` as any)}>
                            <View style={[styles.commIconBg, { backgroundColor: '#DCFCE7' }]}>
                                <MaterialCommunityIcons name="chat" size={28} color="#22C55E" />
                            </View>
                            <Text style={styles.commLabel}>Message</Text>
                        </TouchableOpacity>
                    </View>

                    {profile.interests && profile.interests.length > 0 && (
                        <>
                            <View style={styles.dividerH} />
                            <Text style={styles.sectionTitle}>Interests</Text>
                            <View style={styles.interestsContainer}>
                                {profile.interests.map((interest: string, index: number) => (
                                    <View key={index} style={styles.interestPill}>
                                        <Text style={styles.interestText}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#020617',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        paddingBottom: 30,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerNav: {
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10B981',
        borderWidth: 3,
        borderColor: '#3B82F6',
    },
    profileInfo: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    username: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
        marginBottom: 12,
    },
    bio: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 20,
        marginHorizontal: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        paddingVertical: 12,
        marginHorizontal: 24,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    contentContainer: {
        padding: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    followBtn: {
        backgroundColor: '#8B5CF6',
    },
    followingBtn: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1.5,
        borderColor: '#8B5CF6',
    },
    followingBtnText: {
        color: '#8B5CF6',
    },
    friendRequestBtn: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1.5,
        borderColor: '#3B82F6',
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dividerH: {
        height: 1,
        backgroundColor: '#1E293B',
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F1F5F9',
        marginBottom: 16,
    },
    commGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    commCard: {
        flex: 1,
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    commIconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    commLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    interestPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    interestText: {
        fontSize: 13,
        color: '#E2E8F0',
        fontWeight: '500',
    },
});
