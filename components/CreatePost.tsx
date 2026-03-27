import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { postsApi } from '@/api/posts';

export default function CreatePost({ visible, onClose, onCreated }) {
    const { colors, isDark } = useTheme();
    const [media, setMedia] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [visibility, setVisibility] = useState('all');
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
            await postsApi.createPost(caption, media, visibility);
            setMedia(null);
            setCaption('');
            setVisibility('all');
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
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>New Post</Text>
                    <TouchableOpacity onPress={uploadPost} disabled={loading || !media}>
                        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.postBtn, { color: colors.primary }, !media && { color: colors.textMuted }]}>Share</Text>}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.visibilityArea}>
                            <Text style={styles.visibilityLabel}>Share with:</Text>
                            <TouchableOpacity onPress={() => setVisibility('all')} style={[styles.visibilityBtn, visibility === 'all' && styles.visibilityBtnActive]}>
                                <Text style={[styles.visibilityBtnText, visibility === 'all' && styles.visibilityBtnTextActive]}>🌍 All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setVisibility('close_friends')} style={[styles.visibilityBtn, visibility === 'close_friends' && styles.visibilityBtnActive]}>
                                <Text style={[styles.visibilityBtnText, visibility === 'close_friends' && styles.visibilityBtnTextActive]}>💚 Close Friends</Text>
                            </TouchableOpacity>
                        </View>
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
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
    },
    placeholderBox: {
        width: 80,
        height: 80,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    captionInput: {
        flex: 1,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    visibilityArea: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    visibilityLabel: {
        color: '#94A3B8',
        marginRight: 8,
    },
    visibilityBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    visibilityBtnActive: {
        backgroundColor: '#10B98120',
        borderColor: '#10B981',
    },
    visibilityBtnText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    visibilityBtnTextActive: {
        color: '#10B981',
        fontWeight: 'bold',
    }
});
