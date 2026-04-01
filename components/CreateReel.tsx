import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { reelsApi } from '@/api/reels';
import { profilesApi } from '@/api/profiles';

// Requires to add upload endpoint in the backend. Assuming standard multipart flow.
import client, { fetchWithAuth } from '@/api/client';

export default function CreateReel({ visible, onClose, onCreated }) {
    const [media, setMedia] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentionResults, setShowMentionResults] = useState(false);
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [visibility, setVisibility] = useState('all');
    const [loading, setLoading] = useState(false);

    const player = useVideoPlayer(media, p => {
        p.loop = true;
        p.muted = true;
    });

    useEffect(() => {
        if (media && visible) {
            player.play();
        } else {
            player.pause();
        }
    }, [media, visible, player]);

    const handleMentionSearch = async (text: string) => {
        setMentionSearch(text);
        if (text.length > 1) {
            try {
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

    const pickVideo = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia(result.assets[0].uri);
        }
    };

    const uploadReel = async () => {
        if (!media) return;
        setLoading(true);

        try {
            // 1. Upload video
            const formData = new FormData();
            formData.append('media', {
                uri: media,
                name: 'reel.mp4',
                type: 'video/mp4',
            } as any);

            if (__DEV__) {
                console.log('[API] Uploading reel video:', media);
            }

            const uploadRes = await fetchWithAuth(`reels/upload/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`Upload failed HTTP ${uploadRes.status}: ${errorText}`);
            }

            const data = await uploadRes.json();
            const video_url = data.url;

            // 2. Create Reel record
            await reelsApi.createReel(video_url, caption, visibility);

            setMedia(null);
            setCaption('');
            setVisibility('all');
            if (onCreated) onCreated();
            onClose();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to upload reel: ${e?.message || 'Unknown error'}`);
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
                    <Text style={styles.title}>New Reel</Text>
                    <TouchableOpacity onPress={uploadReel} disabled={loading || !media}>
                        {loading ? <ActivityIndicator color="#3B82F6" /> : <Text style={[styles.postBtn, !media && { color: '#64748B' }]}>Share</Text>}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.content}>
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
                            <TouchableOpacity style={styles.mediaSelector} onPress={pickVideo}>
                                {media ? (
                                    <View style={styles.previewContainer}>
                                        <VideoView
                                            player={player}
                                            style={styles.preview}
                                            contentFit="cover"
                                            nativeControls={false}
                                        />
                                        <View style={styles.videoIcon}>
                                            <MaterialCommunityIcons name="video" size={16} color="#FFF" />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.placeholderBox}>
                                        <MaterialCommunityIcons name="video-plus" size={32} color="#94A3B8" />
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

                        {/* Mention Selection */}
                        <View style={styles.mentionRow}>
                            <MaterialCommunityIcons name="at" size={20} color="#3B82F6" />
                            <TextInput
                                placeholder="Mention someone..."
                                placeholderTextColor="#64748B"
                                style={styles.mentionInput}
                                value={mentionSearch}
                                onChangeText={handleMentionSearch}
                            />
                        </View>

                        {showMentionResults && foundUsers.length > 0 && (
                            <View style={styles.mentionResults}>
                                <ScrollView nestedScrollEnabled>
                                    {foundUsers.map(u => (
                                        <TouchableOpacity key={u.id} style={styles.mentionItem} onPress={() => addMention(u)}>
                                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>@{u.username}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                    </View>
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
        flex: 1,
    },
    inputArea: {
        flexDirection: 'row',
    },
    mediaSelector: {
        marginRight: 16,
    },
    previewContainer: {
        width: 80,
        height: 140, // Vertical orientation for reels
        borderRadius: 8,
        overflow: 'hidden',
    },
    preview: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
    },
    videoIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 2,
        borderRadius: 4,
    },
    placeholderBox: {
        width: 80,
        height: 140,
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
    },
    mentionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
        marginTop: 10,
    },
    mentionInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        marginLeft: 10,
    },
    mentionResults: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        marginTop: 8,
        maxHeight: 150,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    mentionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    }
});

import { ScrollView } from 'react-native';
