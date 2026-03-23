import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { streaksApi } from '@/api/streaks';
import { useTheme } from '@/context/ThemeContext';

interface CreateStreakProps {
    visible: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export default function CreateStreak({ visible, onClose, onCreated }: CreateStreakProps) {
    const { colors } = useTheme();
    const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
    const [visibility, setVisibility] = useState<'all' | 'close_friends'>('all');
    const [loading, setLoading] = useState(false);

    const pickMedia = async (type: 'Images' | 'Videos' | 'All') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your gallery.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'Videos' ? ImagePicker.MediaTypeOptions.Videos : type === 'Images' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
            videoMaxDuration: 15,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.type === 'video' && asset.duration && asset.duration > 15000) {
                Alert.alert('Video too long', 'Please select a video shorter than 15 seconds.');
                return;
            }
            setMedia({
                uri: asset.uri,
                type: asset.type === 'video' ? 'video' : 'image'
            });
        }
    };

    const handleUpload = async () => {
        if (!media) return;
        setLoading(true);
        try {
            await streaksApi.uploadStreak({
                media: { uri: media.uri },
                media_type: media.type,
                visibility,
            });

            setMedia(null);
            setVisibility('all');
            if (onCreated) onCreated();
            onClose();
        } catch (e: any) {
            console.error(e);
            Alert.alert('Upload Failed', e?.response?.data?.error || 'Could not upload streak');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <MaterialCommunityIcons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>New Streak 🔥</Text>
                    {media ? (
                        <TouchableOpacity onPress={handleUpload} disabled={loading} style={styles.shareBtn}>
                            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.shareText, { color: colors.primary }]}>Share</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>

                {media && (
                    <View style={[styles.visibilityRow, { backgroundColor: colors.surfaceAlt }]}>
                        <TouchableOpacity 
                            style={[styles.visibilityBtn, visibility === 'all' && { backgroundColor: colors.primary }]} 
                            onPress={() => setVisibility('all')}
                        >
                            <MaterialCommunityIcons name="earth" size={18} color={visibility === 'all' ? '#FFF' : colors.textMuted} />
                            <Text style={[styles.visibilityText, { color: visibility === 'all' ? '#FFF' : colors.textMuted }]}>Everyone</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.visibilityBtn, visibility === 'close_friends' && { backgroundColor: '#10B981' }]} 
                            onPress={() => setVisibility('close_friends')}
                        >
                            <MaterialCommunityIcons name="heart-multiple" size={18} color={visibility === 'close_friends' ? '#FFF' : colors.textMuted} />
                            <Text style={[styles.visibilityText, { color: visibility === 'close_friends' ? '#FFF' : colors.textMuted }]}>Close Friends</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.content}>
                    {media ? (
                        <View style={styles.previewContainer}>
                            {media.type === 'video' ? (
                                <Video
                                    source={{ uri: media.uri }}
                                    style={styles.preview}
                                    resizeMode={ResizeMode.COVER}
                                    isLooping
                                    shouldPlay
                                />
                            ) : (
                                <Image source={{ uri: media.uri }} style={styles.preview} />
                            )}
                            <TouchableOpacity style={styles.removeBtn} onPress={() => setMedia(null)}>
                                <MaterialCommunityIcons name="close-circle" size={32} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.optionGrid}>
                            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => pickMedia('Images')}>
                                <MaterialCommunityIcons name="image-plus" size={48} color={colors.primary} />
                                <Text style={[styles.uploadText, { color: colors.text }]}>Pick Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => pickMedia('Videos')}>
                                <MaterialCommunityIcons name="video-plus" size={48} color="#A855F7" />
                                <Text style={[styles.uploadText, { color: colors.text }]}>Pick Video (15s)</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 50,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    shareBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    shareText: {
        fontSize: 16,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewContainer: {
        width: '100%',
        aspectRatio: 9 / 16,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000',
    },
    preview: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 16,
    },
    optionGrid: {
        flexDirection: 'row',
        gap: 20,
        width: '100%',
        justifyContent: 'center',
    },
    uploadBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 140,
        height: 180,
        borderRadius: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    uploadText: {
        marginTop: 12,
        fontWeight: '700',
        fontSize: 13,
    },
    visibilityRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 16,
        gap: 12,
    },
    visibilityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
    },
    visibilityText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
