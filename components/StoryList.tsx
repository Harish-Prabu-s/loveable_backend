import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

export default function StoryList({ stories, onStoryPress, onCreatePress }) {
    const { user } = useAuthStore();

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Your Story / Create Button */}
                <TouchableOpacity style={styles.storyContainer} onPress={onCreatePress}>
                    <View style={styles.createStoryRing}>
                        <Image
                            source={{ uri: (user as any)?.profile?.photo || 'https://via.placeholder.com/150' }}
                            style={styles.avatar}
                        />
                        <View style={styles.addIconContainer}>
                            <MaterialCommunityIcons name="plus" size={14} color="#FFF" />
                        </View>
                    </View>
                    <Text style={styles.username} numberOfLines={1}>Your Story</Text>
                </TouchableOpacity>

                {/* Other Users' Stories - Grouped by user */}
                {Object.values(stories?.reduce((acc: any, story: any) => {
                    const userId = story.user;
                    if (!acc[userId]) acc[userId] = story;
                    return acc;
                }, {} as any) || {}).map((story: any, index: number) => (
                    <TouchableOpacity key={story.id || index} style={styles.storyContainer} onPress={() => onStoryPress(story)}>
                        <View style={[styles.storyRing, !story.viewed && styles.unviewedRing]}>
                            <Image
                                source={{ uri: story.user_avatar || 'https://via.placeholder.com/150' }}
                                style={styles.avatar}
                            />
                        </View>
                        <Text style={styles.username} numberOfLines={1}>{story.user_display_name}</Text>
                    </TouchableOpacity>
                ))}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    scrollContent: {
        paddingHorizontal: 12,
        gap: 16,
    },
    storyContainer: {
        alignItems: 'center',
        width: 72,
    },
    createStoryRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        position: 'relative',
    },
    storyRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    unviewedRing: {
        borderColor: '#EC4899', // Pinkish gradient color ideally
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0F172A',
    },
    addIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#020617',
    },
    username: {
        color: '#F8FAFC',
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    }
});
