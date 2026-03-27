import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { profilesApi } from '@/api/profiles';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';
import { toast } from '@/utils/toast';
import { walletApi } from '@/api/wallet';

interface Friend {
    user: number;
    id: number;
    display_name: string;
    photo: string | null;
    gender?: string;
}

interface ShareSheetProps {
    visible: boolean;
    onClose: () => void;
    onShare: (targetUserId: number) => Promise<void>;
}

export const ShareSheet = ({ visible, onClose, onShare }: ShareSheetProps) => {
    const { colors, isDark } = useTheme();
    const [search, setSearch] = useState('');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharingId, setSharingId] = useState<number | null>(null);

    useEffect(() => {
        if (visible) {
            fetchFriends();
        }
    }, [visible, search]);

    const fetchFriends = async () => {
        setLoading(true);
        try {
            // Reusing listProfiles as a simple friend search for now
            const data = await profilesApi.listProfiles(search);
            setFriends(data as any);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (friend: Friend) => {
        setSharingId(friend.user);
        try {
            await onShare(friend.user);
            toast.success(`Shared with ${friend.display_name}`);
            
            // Reward user with 10 coins
            try {
                await walletApi.earnCoins({ amount: 10, description: `Shared a ${friend.gender === 'F' ? 'reel' : 'post'} with ${friend.display_name}` });
                toast.success("Reward: You earned 10 coins!");
            } catch (err) {
                console.error('Failed to award coins', err);
            }
        } catch (e) {
            toast.error("Failed to share");
        } finally {
            setSharingId(null);
        }
    };

    const renderFriend = ({ item }: { item: Friend }) => (
        <View style={styles.friendItem}>
            <Image
                source={{
                    uri: getMediaUrl(item.photo) || generateAvatarUrl(item.display_name, item.gender as any)
                }}
                style={styles.avatar}
            />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.display_name}
            </Text>
            <TouchableOpacity
                onPress={() => handleShare(item)}
                disabled={sharingId === item.user}
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            >
                {sharingId === item.user ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Text style={styles.shareBtnText}>Share</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
                <View style={[styles.sheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
                    <View style={[styles.indicator, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Share to Friends</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.searchContainer, { backgroundColor: colors.surfaceAlt }]}>
                        <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search friends..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {loading && friends.length === 0 ? (
                        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
                    ) : (
                        <FlatList
                            data={friends}
                            renderItem={renderFriend}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No friends found</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dismissArea: {
        flex: 1,
    },
    sheet: {
        height: '60%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
    },
    indicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 44,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    name: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    shareBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    shareBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    loader: {
        flex: 1,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 14,
    },
});
