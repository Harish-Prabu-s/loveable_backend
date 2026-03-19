import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi } from '@/api/stories'; // To be implemented

export default function CreateStory({ visible, onClose, onCreated }) {
    const [media, setMedia] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<'all' | 'close_friends'>('all');
    const [loading, setLoading] = useState(false);

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
            await storiesApi.createStory(response.url, 'image', visibility);

            setMedia(null);
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
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>New Story</Text>
                    {media ? (
                        <TouchableOpacity onPress={uploadStory} disabled={loading}>
                            {loading ? <ActivityIndicator color="#3B82F6" /> : <Text style={styles.postBtn}>Share</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 28 }} /> // Placeholder
                    )}
                </View>

                {media && (
                    <View style={styles.visibilityRow}>
                        <TouchableOpacity 
                            style={[styles.visibilityBtn, visibility === 'all' && styles.visibilityBtnActive]} 
                            onPress={() => setVisibility('all')}
                        >
                            <MaterialCommunityIcons name="earth" size={18} color={visibility === 'all' ? '#FFF' : '#94A3B8'} />
                            <Text style={[styles.visibilityText, visibility === 'all' && styles.visibilityTextActive]}>Everyone</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.visibilityBtn, visibility === 'close_friends' && styles.visibilityBtnActive]} 
                            onPress={() => setVisibility('close_friends')}
                        >
                            <MaterialCommunityIcons name="heart-multiple" size={18} color={visibility === 'close_friends' ? '#FFF' : '#94A3B8'} />
                            <Text style={[styles.visibilityText, visibility === 'close_friends' && styles.visibilityTextActive]}>Close Friends</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.content}>
                    {media ? (
                        <Image source={{ uri: media }} style={styles.preview} />
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
    }
});
