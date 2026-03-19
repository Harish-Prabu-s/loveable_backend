import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, Alert,
    ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi } from '@/api/stories';

export default function CreateStoryScreen() {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [visibility, setVisibility] = useState('all');
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [9, 16],
        });
        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission required', 'Please allow camera access.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [9, 16],
        });
        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const publishStory = async () => {
        if (!imageUri) return;
        setUploading(true);
        try {
            const { url } = await storiesApi.uploadMedia(imageUri);
            await storiesApi.createStory(url, 'image', visibility);
            Alert.alert('Story posted!', 'Your story is now live for 24 hours.');
            router.back();
        } catch (err) {
            Alert.alert('Failed', 'Could not upload the story. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Story</Text>
                {imageUri && (
                    <TouchableOpacity onPress={publishStory} style={styles.publishBtn} disabled={uploading}>
                        {uploading
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <Text style={styles.publishText}>Share</Text>}
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.previewArea}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                ) : (
                    <View style={styles.placeholder}>
                        <MaterialCommunityIcons name="image-plus" size={60} color="#334155" />
                        <Text style={styles.placeholderText}>Pick a photo or take one</Text>
                    </View>
                )}
            </View>

            {imageUri && (
                <View style={styles.visibilityArea}>
                    <Text style={styles.visibilityLabel}>Share with:</Text>
                    <TouchableOpacity onPress={() => setVisibility('all')} style={[styles.visibilityBtn, visibility === 'all' && styles.visibilityBtnActive]}>
                        <Text style={[styles.visibilityBtnText, visibility === 'all' && styles.visibilityBtnTextActive]}>🌍 All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setVisibility('close_friends')} style={[styles.visibilityBtn, visibility === 'close_friends' && styles.visibilityBtnActive]}>
                        <Text style={[styles.visibilityBtnText, visibility === 'close_friends' && styles.visibilityBtnTextActive]}>💚 Close Friends</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionCard} onPress={pickImage}>
                    <View style={[styles.iconCircle, { backgroundColor: '#8B5CF615' }]}>
                        <MaterialCommunityIcons name="image" size={28} color="#8B5CF6" />
                    </View>
                    <Text style={styles.actionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={takePhoto}>
                    <View style={[styles.iconCircle, { backgroundColor: '#3B82F615' }]}>
                        <MaterialCommunityIcons name="camera" size={28} color="#3B82F6" />
                    </View>
                    <Text style={styles.actionText}>Camera</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#1E293B',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
    publishBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    publishText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    previewArea: {
        flex: 1, margin: 20, borderRadius: 24, overflow: 'hidden',
        backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B',
    },
    preview: { flex: 1 },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: '#475569', fontSize: 15, marginTop: 12 },
    actions: { flexDirection: 'row', padding: 20, gap: 16 },
    actionCard: {
        flex: 1, backgroundColor: '#0F172A', borderRadius: 20,
        padding: 20, alignItems: 'center',
        borderWidth: 1, borderColor: '#1E293B',
    },
    iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    actionText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
    visibilityArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
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
