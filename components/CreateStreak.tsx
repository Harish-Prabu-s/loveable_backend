import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { streaksApi } from '@/api/streaks';

interface CreateStreakProps {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateStreak({ visible, onClose, onCreated }: CreateStreakProps) {
    const [media, setMedia] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [visibility, setVisibility] = useState<'all' | 'close_friends'>('all');
    const [loading, setLoading] = useState(false);

    const pickMedia = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia(result.assets[0].uri);
            setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
        }
    };

    const uploadStreak = async () => {
        if (!media) {
            alert("Please select a photo or video");
            return;
        }
        setLoading(true);
        try {
            await streaksApi.uploadStreak({
                media: { uri: media },
                media_type: mediaType,
                visibility: visibility
            });
            setMedia(null);
            onCreated();
        } catch (e) {
            console.error(e);
            alert('Failed to upload streak');
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
                    <Text style={styles.title}>Send Streak 🔥</Text>
                    <TouchableOpacity onPress={uploadStreak} disabled={loading || !media}>
                        {loading ? <ActivityIndicator color="#EF4444" /> : <Text style={[styles.postBtn, !media && { color: '#64748B' }]}>Send</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.visibilityArea}>
                        <Text style={styles.visibilityLabel}>Visibility:</Text>
                        <TouchableOpacity onPress={() => setVisibility('all')} style={[styles.visibilityBtn, visibility === 'all' && styles.visibilityBtnActive]}>
                            <Text style={[styles.visibilityBtnText, visibility === 'all' && styles.visibilityBtnTextActive]}>🌍 All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setVisibility('close_friends')} style={[styles.visibilityBtn, visibility === 'close_friends' && styles.visibilityBtnActive]}>
                            <Text style={[styles.visibilityBtnText, visibility === 'close_friends' && styles.visibilityBtnTextActive]}>💚 Close Friends Only</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.mediaSelector} onPress={pickMedia}>
                        {media ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: media }} style={styles.preview} />
                                {mediaType === 'video' && (
                                    <View style={styles.videoBadge}>
                                        <MaterialCommunityIcons name="play" size={24} color="#FFF" />
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.placeholderBox}>
                                <MaterialCommunityIcons name="camera-plus" size={48} color="#94A3B8" />
                                <Text style={styles.placeholderText}>Select Media</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.infoText}>
                        Streaks are sent to all your active friends. Build your connection every day!
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
        backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#1E293B',
    },
    title: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    postBtn: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
    content: { padding: 16, alignItems: 'center' },
    visibilityArea: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8, alignSelf: 'stretch' },
    visibilityLabel: { color: '#94A3B8', marginRight: 4 },
    visibilityBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
    visibilityBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3B82F6' },
    visibilityBtnText: { color: '#94A3B8', fontSize: 13 },
    visibilityBtnTextActive: { color: '#3B82F6', fontWeight: 'bold' },
    mediaSelector: { width: '100%', aspectRatio: 9 / 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed' },
    previewContainer: { width: '100%', height: '100%' },
    preview: { width: '100%', height: '100%', resizeMode: 'cover' },
    videoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4 },
    placeholderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: '#94A3B8', marginTop: 12, fontSize: 16, fontWeight: '600' },
    infoText: { color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 24, paddingHorizontal: 20 },
});
