import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MediaViewerScreen() {
    const { uri, type } = useLocalSearchParams<{ uri: string; type: 'image' | 'video' }>();
    const isVideo = type === 'video';

    const player = useVideoPlayer(isVideo ? uri : null, p => {
        p.loop = true;
        p.play();
    });

    if (!uri) return null;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.content}>
                {/* Header/Close Button */}
                <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => router.back()}
                >
                    <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Media Content */}
                <View style={styles.mediaContainer}>
                    {type === 'image' ? (
                        <Image
                            source={{ uri }}
                            style={styles.fullMedia}
                            contentFit="contain"
                            transition={200}
                        />
                    ) : (
                        <VideoView
                            player={player}
                            style={styles.fullMedia}
                            contentFit="contain"
                            nativeControls={true}
                            allowsFullscreen
                        />
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    mediaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullMedia: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
    },
});
