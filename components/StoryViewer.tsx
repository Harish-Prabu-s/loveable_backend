import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { storiesApi } from '@/api/stories'; // To be implemented
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function StoryViewer({ visible, story, onClose, onNext, onPrev, onDelete }) {
    const [progress, setProgress] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer;
        if (visible && story) {
            setProgress(0);
            // Record view
            storiesApi.viewStory(story.id).catch(() => { });

            timer = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 1) {
                        clearInterval(timer);
                        if (onNext) onNext();
                        else onClose();
                        return 1;
                    }
                    return prev + 0.05; // 5% every 250ms -> 5 seconds total
                });
            }, 250);
        }
        return () => clearInterval(timer);
    }, [visible, story]);

    if (!visible || !story) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.container}>
                <SafeAreaView style={styles.safeArea}>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Image source={{ uri: story.user_avatar }} style={styles.avatar} />
                            <Text style={styles.username}>{story.user_display_name}</Text>
                            <Text style={styles.timeText}>2h</Text>
                        </View>
                        <View style={styles.headerRight}>
                            {story.is_owner && (
                                <TouchableOpacity 
                                    onPress={async () => {
                                        setIsDeleting(true);
                                        await onDelete(story.id);
                                        setIsDeleting(false);
                                    }} 
                                    style={styles.headerBtn}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Controls Overlay */}
                    <View style={styles.controlsOverlay}>
                        <TouchableOpacity style={styles.leftControl} onPress={onPrev} />
                        <TouchableOpacity style={styles.rightControl} onPress={onNext} />
                    </View>

                    {/* Media */}
                    <Image
                        source={{ uri: story.media_url }}
                        style={styles.media}
                        resizeMode="cover"
                    />

                    {/* Viewer Count Overlay (If own story) */}
                    <View style={styles.footer}>
                        <MaterialCommunityIcons name="eye" size={20} color="#FFF" />
                        <Text style={styles.viewCount}>{story.view_count || 0}</Text>
                    </View>

                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
        position: 'relative',
    },
    progressContainer: {
        position: 'absolute',
        top: 50,
        left: 10,
        right: 10,
        height: 3,
        zIndex: 10,
        flexDirection: 'row',
    },
    progressTrack: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginHorizontal: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFF',
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    username: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
    },
    timeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBtn: {
        padding: 8,
        marginLeft: 8,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        zIndex: 5,
    },
    leftControl: {
        flex: 1,
    },
    rightControl: {
        flex: 1,
    },
    media: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    viewCount: {
        color: '#FFF',
        marginLeft: 6,
        fontWeight: 'bold',
    }
});
