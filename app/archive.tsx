import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { archiveApi, ArchiveType } from '@/api/archive';
import { toast } from '@/utils/toast';

export default function ArchiveScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [selectedType, setSelectedType] = useState<ArchiveType>('post');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadArchived();
    }, [selectedType]);

    const loadArchived = async () => {
        setLoading(true);
        try {
            const data = await archiveApi.getArchived(selectedType);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load archived items");
        } finally {
            setLoading(false);
        }
    };

    const handleUnarchive = async (id: number) => {
        try {
            await archiveApi.unarchive(selectedType, id);
            setItems(prev => prev.filter(item => item.id !== id));
            toast.success("Unarchived successfully");
        } catch (e) {
            toast.error("Failed to unarchive");
        }
    };

    const handleDelete = async (id: number) => {
        Alert.alert(
            "Delete Permanently",
            "This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await archiveApi.delete(selectedType, id);
                            setItems(prev => prev.filter(item => item.id !== id));
                            toast.success("Deleted permanently");
                        } catch (e) {
                            toast.error("Failed to delete");
                        }
                    } 
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        if (selectedType === 'post') {
            return (
                <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Image source={{ uri: item.image }} style={styles.thumbnail} />
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemCaption, { color: colors.text }]} numberOfLines={2}>
                            {item.caption || 'No caption'}
                        </Text>
                        <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => handleUnarchive(item.id)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="archive-arrow-up" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        if (selectedType === 'reel') {
            return (
                <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.thumbnail, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="play-circle-outline" size={32} color="#FFF" />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemCaption, { color: colors.text }]} numberOfLines={2}>
                            {item.caption || 'No caption'}
                        </Text>
                        <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => handleUnarchive(item.id)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="archive-arrow-up" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        if (selectedType === 'chat') {
            return (
                <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemCaption, { color: colors.text }]}>
                            Chat with {item.other_user?.display_name || 'User'}
                        </Text>
                        <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                            Archived Chat
                        </Text>
                    </View>
                    <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => handleUnarchive(item.id)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="archive-arrow-up" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return null;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Archive</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                {(['post', 'reel', 'chat'] as ArchiveType[]).map((type) => (
                    <TouchableOpacity
                        key={type}
                        onPress={() => setSelectedType(type)}
                        style={[
                            styles.tab,
                            selectedType === type && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: selectedType === type ? colors.primary : colors.textMuted }
                        ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}s
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centerParams}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.centerParams}>
                    <MaterialCommunityIcons name="archive-outline" size={64} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No archived {selectedType}s</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 10,
    },
    tab: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginRight: 10,
    },
    tabText: { fontWeight: '600', fontSize: 16 },
    listContent: { padding: 16 },
    itemCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 12, marginBottom: 12,
        borderWidth: 1,
    },
    thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
    itemInfo: { flex: 1 },
    itemCaption: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    itemDate: { fontSize: 12 },
    itemActions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { padding: 8, marginLeft: 4 },
    centerParams: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 18, marginTop: 16, fontWeight: '600' },
});
