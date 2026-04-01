import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { useTheme } from '@/context/ThemeContext';
import { streaksApi } from '@/api/streaks';
import { notificationsApi } from '@/api/notifications';
import { useAuthStore } from '@/store/authStore';
import { CommentSheet } from './CommentSheet';
import type { StreakUpload, StreakComment } from '@/types';

const { width, height } = Dimensions.get('window');

interface StreakViewerProps {
    visible: boolean;
    uploadId: number | null;
    onClose: () => void;
}

export default function StreakViewer({ visible, uploadId, onClose }: StreakViewerProps) {
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const [upload, setUpload] = useState<StreakUpload | null>(null);
    const [loading, setLoading] = useState(true);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<StreakComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);

    const isVideo = upload?.media_type === 'video';
    const player = useVideoPlayer(isVideo ? upload.media_url : null, p => {
        p.loop = true;
    });

    useEffect(() => {
        if (isVideo && visible) {
            player.play();
        } else {
            player.pause();
        }
    }, [isVideo, visible, player]);

    useEffect(() => {
        if (visible && uploadId) {
            loadUpload();
        } else {
            setUpload(null);
            setLoading(true);
            setShowComments(false);
        }
    }, [visible, uploadId]);

    const loadUpload = async () => {
        try {
            setLoading(true);
            const data = await streaksApi.getUpload(uploadId!);
            setUpload(data);
        } catch (error) {
            console.error('Failed to load streak upload:', error);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        if (!uploadId) return;
        setLoadingComments(true);
        try {
            const data = await streaksApi.listComments(uploadId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load streak comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async (text: string) => {
        if (!uploadId) return;
        try {
            await streaksApi.addComment(uploadId, text);
            await loadComments();
        } catch (error) {
            console.error('Failed to add comment:', error);
        }
    };

    useEffect(() => {
        if (visible && upload && user) {
            // Privacy Protection
            ScreenCapture.preventScreenCaptureAsync();
            const subscription = ScreenCapture.addScreenshotListener(() => {
                if (upload.user.user !== user.id) {
                    notificationsApi.notifyScreenshot(upload.user.user, 'streak', upload.id)
                        .catch(console.error);
                }
            });

            return () => {
                subscription.remove();
                ScreenCapture.allowScreenCaptureAsync();
            };
        }
    }, [visible, upload, user]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#EF4444" />
                ) : upload ? (
                    <>
                        <View style={styles.mediaContainer}>
                            {upload.media_type === 'video' ? (
                                <VideoView
                                    player={player}
                                    style={styles.media}
                                    contentFit="contain"
                                    nativeControls={false}
                                />
                            ) : (
                                <Image
                                    source={{ uri: upload.media_url }}
                                    style={styles.media}
                                    contentFit="contain"
                                />
                            )}
                        </View>

                        {/* Overlay components */}
                        <SafeAreaView style={styles.overlay}>
                            <View style={styles.header}>
                                <View style={styles.userInfo}>
                                    <Image
                                        source={{ uri: upload.user.photo || undefined }}
                                        style={styles.avatar}
                                    />
                                    <View>
                                        <Text style={styles.userName}>{upload.user.display_name}</Text>
                                        <Text style={styles.timeText}>
                                            {new Date(upload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footer}>
                                <TouchableOpacity 
                                    style={styles.commentTrigger}
                                    onPress={() => {
                                        setShowComments(true);
                                        loadComments();
                                    }}
                                >
                                    <MaterialCommunityIcons name="comment-outline" size={24} color="#FFF" />
                                    <Text style={styles.footerText}>Comments</Text>
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>

                        <CommentSheet
                            visible={showComments}
                            onClose={() => setShowComments(false)}
                            comments={comments.map(c => ({
                                id: c.id,
                                user_display_name: c.user.display_name,
                                user_avatar: c.user.photo,
                                text: c.text,
                                created_at: c.created_at
                            }))}
                            loading={loadingComments}
                            onAddComment={handleAddComment}
                        />
                    </>
                ) : null}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    mediaContainer: {
        flex: 1,
    },
    media: {
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 40,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    userName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    timeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    closeBtn: {
        padding: 8,
    },
    footer: {
        padding: 24,
        alignItems: 'center',
        paddingBottom: 40,
    },
    commentTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 8,
    },
    footerText: {
        color: '#FFF',
        fontWeight: '600',
    },
});
