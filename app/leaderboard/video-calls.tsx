import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { gamificationApi } from '@/api/gamification';
import { useTheme } from '@/context/ThemeContext';
import { generateAvatarUrl } from '@/utils/avatar';

export default function VideoCallLeaderboardScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const results = await gamificationApi.getVideoCallLeaderboard();
            setData(results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isTop3 = index < 3;
        const rankColors = ['#FBBF24', '#94A3B8', '#B45309'];
        const rankColor = isTop3 ? rankColors[index] : colors.textMuted;

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/user/${item.user_id}` as any)}
            >
                <View style={styles.rankContainer}>
                    {index === 0 ? <MaterialCommunityIcons name="crown" size={20} color="#FBBF24" /> : 
                     <Text style={[styles.rankText, { color: rankColor }]}>#{index + 1}</Text>}
                </View>
                
                <Image 
                    source={{ uri: item.profile_pic || generateAvatarUrl(item.user_id, 'M') }} 
                    style={styles.avatar} 
                />
                
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.display_name || item.username}</Text>
                    <Text style={[styles.username, { color: colors.textMuted }]}>@{item.username}</Text>
                </View>

                <View style={styles.scoreContainer}>
                    <MaterialCommunityIcons name="video" size={16} color={colors.primary} />
                    <Text style={[styles.scoreText, { color: colors.primary }]}>{formatDuration(item.total_duration)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Video Call Ranking</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.user_id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={{ color: colors.textMuted }}>No data yet</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1,
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    list: { padding: 16 },
    card: {
        flexDirection: 'row', alignItems: 'center', padding: 12, 
        marginBottom: 12, borderRadius: 16, borderWidth: 1,
    },
    rankContainer: { width: 40, alignItems: 'center', marginRight: 8 },
    rankText: { fontSize: 16, fontWeight: '800' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E293B', marginRight: 12 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700' },
    username: { fontSize: 12 },
    scoreContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
    scoreText: { fontWeight: '800', fontSize: 14 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { padding: 40, alignItems: 'center' }
});
