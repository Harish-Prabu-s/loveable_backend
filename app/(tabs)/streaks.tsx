import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ScrollView,
    TextInput,
    StatusBar,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { streaksApi } from '@/api/streaks';
import { useAuthStore } from '@/store/authStore';
import CreateStreakModal from '@/components/CreateStreak';
import { StreakCircle, InlineStreakViewer, avatar } from '@/components/InlineStreakViewer';

const { width: SCREEN_W } = Dimensions.get('window');

export default function StreaksScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { user } = useAuthStore();
    
    const [friendStreaks, setFriendStreaks] = useState<any[]>([]);
    const [allStreaks, setAllStreaks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const loadData = useCallback(async () => {
        try {
            const [frData, alData] = await Promise.all([
                streaksApi.getSnapchatStreaks('friends').catch(() => []),
                streaksApi.getSnapchatStreaks('all').catch(() => []),
            ]);
            setFriendStreaks(Array.isArray(frData) ? frData : []);
            setAllStreaks(Array.isArray(alData) ? alData : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleOpenViewer = (u: any) => {
        setSelectedUser(u);
        setViewerVisible(true);
    };

    const handleNextUser = () => {
        const list = allStreaks;
        const idx = list.findIndex(u => u.user_id === selectedUser?.user_id);
        if (idx !== -1 && idx < list.length - 1) {
            setSelectedUser(list[idx + 1]);
        } else {
            setViewerVisible(false);
        }
    };

    const handlePrevUser = () => {
        const list = allStreaks;
        const idx = list.findIndex(u => u.user_id === selectedUser?.user_id);
        if (idx > 0) {
            setSelectedUser(list[idx - 1]);
        }
    };

    const myStreak = allStreaks.find(u => u.user_id === user?.id);
    const otherFriends = friendStreaks.filter(u => u.user_id !== user?.id);

    const renderHeader = () => (
        <View style={styles.topHeader}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyScroll}>
                <StreakCircle 
                    isMe={true} 
                    item={myStreak}
                    profile={user}
                    onAddPress={() => setShowCreate(true)} 
                    onPress={handleOpenViewer} 
                />
                {otherFriends.map((u: any) => (
                    <StreakCircle key={u.user_id} item={u} onPress={handleOpenViewer} />
                ))}
            </ScrollView>

            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
                <TextInput placeholder="Search streaks..." placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} />
            </View>
        </View>
    );

    const UserListItem = ({ item, onPress }: any) => {
        return (
            <TouchableOpacity style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => onPress(item)}>
                <View style={styles.listAvatarWrap}>
                    <View style={[styles.listInner, { backgroundColor: colors.background }]}>
                        <Image source={{ uri: item.media?.media_url || avatar(item.photo, item.user_id) }} style={styles.listAvatar} />
                    </View>
                </View>
                <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: colors.text }]}>{item.display_name || item.username}</Text>
                    <View style={styles.listStatusRow}>
                        <MaterialCommunityIcons name="fire" size={16} color="#EF4444" />
                        <Text style={[styles.listSub, { color: colors.textMuted }]}>{item.streak_count} day streak</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/chat/${item.user_id}` as any)}>
                    <MaterialCommunityIcons name="chat-processing-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.mainHeader}>
                <Text style={[styles.title, { color: colors.text }]}>Streaks 🔥</Text>
                <TouchableOpacity onPress={loadData}>
                    <MaterialCommunityIcons name="refresh" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={allStreaks}
                    keyExtractor={(item) => item.user_id.toString()}
                    ListHeaderComponent={renderHeader}
                    renderItem={({ item }) => <UserListItem item={item} onPress={handleOpenViewer} />}
                    contentContainerStyle={styles.listScroll}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
                <LinearGradient colors={['#7C3AED', '#EF4444']} style={styles.fabGrad}>
                    <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            <CreateStreakModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={loadData} />
            
            <InlineStreakViewer 
                visible={viewerVisible} 
                user={selectedUser} 
                onClose={() => setViewerVisible(false)} 
                onNext={handleNextUser}
                onPrev={handlePrevUser}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    title: { fontSize: 24, fontWeight: '800' },
    topHeader: { paddingBottom: 10 },
    storyScroll: { paddingHorizontal: 15, paddingVertical: 15, gap: 5 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 15, height: 44, marginVertical: 10, borderWidth: 0.5 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
    listScroll: { paddingBottom: 100 },
    listCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 18, borderWidth: 0.5 },
    listAvatarWrap: { marginRight: 15 },
    listInner: { width: 56, height: 56, borderRadius: 28, padding: 2, overflow: 'hidden' },
    listAvatar: { width: '100%', height: '100%', borderRadius: 26 },
    listInfo: { flex: 1 },
    listName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    listStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listSub: { fontSize: 13, fontWeight: '500' },
    chatBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    fab: { position: 'absolute', bottom: 30, right: 25, borderRadius: 32, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
    fabGrad: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
