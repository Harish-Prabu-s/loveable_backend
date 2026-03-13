import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { postsApi } from '@/api/posts';

export default function CreatePost({ visible, onClose, onCreated }) {
    const [media, setMedia] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square for posts
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia(result.assets[0].uri);
        }
    };

    const uploadPost = async () => {
        if (!media) {
            alert("Please select an image");
            return;
        }
        setLoading(true);
        try {
            await postsApi.createPost(caption, media);
            setMedia(null);
            setCaption('');
            if (onCreated) onCreated();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>New Post</Text>
                    <TouchableOpacity onPress={uploadPost} disabled={loading || !media}>
                        {loading ? <ActivityIndicator color="#3B82F6" /> : <Text style={[styles.postBtn, !media && { color: '#64748B' }]}>Share</Text>}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.inputArea}>
                            <TouchableOpacity style={styles.imageSelector} onPress={pickImage}>
                                {media ? (
                                    <Image source={{ uri: media }} style={styles.preview} />
                                ) : (
                                    <View style={styles.placeholderBox}>
                                        <MaterialCommunityIcons name="camera-plus" size={32} color="#94A3B8" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TextInput
                                style={styles.captionInput}
                                placeholder="Write a caption..."
                                placeholderTextColor="#64748B"
                                multiline
                                value={caption}
                                onChangeText={setCaption}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#0F172A',
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
        padding: 16,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    imageSelector: {
        marginRight: 16,
    },
    preview: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#1E293B',
    },
    placeholderBox: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    captionInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    }
});
