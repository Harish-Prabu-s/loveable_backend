import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi } from '@/api/stories'; // To be implemented

export default function CreateStory({ visible, onClose, onCreated }) {
    const [media, setMedia] = useState<string | null>(null);
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
            await storiesApi.createStory(response.url, 'image');

            setMedia(null);
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
    }
});
