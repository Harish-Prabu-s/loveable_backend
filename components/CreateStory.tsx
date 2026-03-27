import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ActivityIndicator, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi } from '@/api/stories';
import { useTheme } from '@/context/ThemeContext';

export default function CreateStory({ visible, onClose, onCreated }) {
    const { colors } = useTheme();
    const [media, setMedia] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<'all' | 'close_friends'>('all');
    const [caption, setCaption] = useState('');
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentionResults, setShowMentionResults] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleMentionSearch = async (text: string) => {
        setMentionSearch(text);
        if (text.length > 1) {
            try {
                const { profilesApi } = await import('@/api/profiles');
                const results = await profilesApi.listProfiles(text);
                setFoundUsers(results || []);
                setShowMentionResults(true);
            } catch (e) {
                console.error("Mention search failed", e);
            }
        } else {
            setShowMentionResults(false);
        }
    };

    const addMention = (user: any) => {
        const mentionTag = `@${user.username || user.display_name} `;
        setCaption(prev => prev + mentionTag);
        setShowMentionResults(false);
        setMentionSearch('');
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia(result.assets[0].uri);
        }
    };

    const uploadStory = async () => {
        if (!media) return;
        setLoading(true);
        try {
            // 1. Upload media to get URL
            const response = await storiesApi.uploadMedia(media, 'image');

            // 2. Create story with URL
            await storiesApi.createStory(response.url, 'image', visibility, caption);

            setMedia(null);
            setCaption('');
            setVisibility('all');
            if (onCreated) onCreated();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to drop story');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>New Story</Text>
                    {media ? (
                        <TouchableOpacity onPress={uploadStory} disabled={loading}>
                            {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.postBtn, { color: colors.primary }]}>Share</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 28 }} /> // Placeholder
                    )}
                </View>

                {media && (
                    <View style={[styles.visibilityRow, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity 
                            style={[styles.visibilityBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, visibility === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]} 
                            onPress={() => setVisibility('all')}
                        >
                            <MaterialCommunityIcons name="earth" size={18} color={visibility === 'all' ? '#FFFFFF' : colors.textSecondary} />
                            <Text style={[styles.visibilityText, { color: colors.textSecondary }, visibility === 'all' && { color: '#FFFFFF' }]}>Everyone</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.visibilityBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, visibility === 'close_friends' && { backgroundColor: colors.accent, borderColor: colors.accent }]} 
                            onPress={() => setVisibility('close_friends')}
                        >
                            <MaterialCommunityIcons name="heart-multiple" size={18} color={visibility === 'close_friends' ? '#FFFFFF' : colors.textSecondary} />
                            <Text style={[styles.visibilityText, { color: colors.textSecondary }, visibility === 'close_friends' && { color: '#FFFFFF' }]}>Close Friends</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.content}>
                    {media ? (
                        <>
                            <Image source={{ uri: media }} style={styles.preview} />
                             <View style={[styles.overlayInput, { backgroundColor: colors.surface + 'CC' }]}>
                                <TextInput
                                    placeholder="Write a caption and @mention friends..."
                                    placeholderTextColor={colors.textMuted}
                                    style={[styles.captionInput, { color: colors.text }]}
                                    value={caption}
                                    onChangeText={setCaption}
                                    multiline
                                />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                                    <MaterialCommunityIcons name="at" size={18} color={colors.primary} />
                                    <TextInput
                                        placeholder="Search to mention..."
                                        placeholderTextColor={colors.textMuted}
                                        style={[styles.mentionInput, { color: colors.text, borderBottomColor: colors.border }]}
                                        value={mentionSearch}
                                        onChangeText={handleMentionSearch}
                                    />
                                </View>
                                {showMentionResults && foundUsers.length > 0 && (
                                    <View style={[styles.mentionResults, { backgroundColor: colors.surfaceAlt }]}>
                                        {foundUsers.map(u => (
                                            <TouchableOpacity key={u.id} style={[styles.mentionItem, { borderBottomColor: colors.border }]} onPress={() => addMention(u)}>
                                                <Text style={{ color: colors.text }}>@{u.username}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                            <MaterialCommunityIcons name="image-plus" size={48} color="#94A3B8" />
                            <Text style={styles.uploadText}>Select from Gallery</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        marginTop: 50,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    title: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    postBtn: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    preview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    uploadBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 200,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        borderWidth: 2,
        borderColor: '#1E293B',
        borderStyle: 'dashed',
    },
    uploadText: {
        color: '#F8FAFC',
        marginTop: 12,
        fontWeight: '500',
    },
    visibilityRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: '#0F172A',
    },
    visibilityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    visibilityBtnActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#A78BFA',
    },
    visibilityText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
    },
    visibilityTextActive: {
        color: '#FFF',
    },
    overlayInput: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: 15,
        borderRadius: 15,
    },
    captionInput: {
        color: '#FFF',
        fontSize: 15,
        maxHeight: 80,
    },
    mentionInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    mentionResults: {
        marginTop: 8,
        backgroundColor: '#1E293B',
        borderRadius: 8,
        maxHeight: 120,
    },
    mentionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    }
});
