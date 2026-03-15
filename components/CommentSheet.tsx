import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import { getMediaUrl } from '@/utils/media';
import { generateAvatarUrl } from '@/utils/avatar';

interface Comment {
    id: number;
    user_display_name: string;
    user_avatar: string | null;
    user_gender?: string;
    text: string;
    created_at: string;
}

interface CommentSheetProps {
    visible: boolean;
    onClose: () => void;
    comments: Comment[];
    loading: boolean;
    onAddComment: (text: string) => Promise<void>;
}

export const CommentSheet = ({ visible, onClose, comments, loading, onAddComment }: CommentSheetProps) => {
    const { colors, isDark } = useTheme();
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!newComment.trim() || submitting) return;
        setSubmitting(true);
        try {
            await onAddComment(newComment.trim());
            setNewComment('');
        } finally {
            setSubmitting(false);
        }
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentItem}>
            <Image
                source={{
                    uri: getMediaUrl(item.user_avatar) || generateAvatarUrl(item.user_display_name, item.user_gender as any)
                }}
                style={styles.avatar}
            />
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <Text style={[styles.username, { color: colors.text }]}>{item.user_display_name}</Text>
                    <Text style={[styles.time, { color: colors.textMuted }]}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <Text style={[styles.text, { color: colors.textSecondary }]}>{item.text}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={[styles.sheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}
                >
                    <View style={[styles.indicator, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
                    ) : (
                        <FlatList
                            data={comments}
                            renderItem={renderComment}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <MaterialCommunityIcons name="comment-outline" size={48} color={colors.textMuted} />
                                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No comments yet</Text>
                                </View>
                            }
                        />
                    )}

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
                            placeholder="Add a comment..."
                            placeholderTextColor={colors.textMuted}
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!newComment.trim() || submitting}
                            style={[
                                styles.sendBtn,
                                { backgroundColor: colors.primary },
                                (!newComment.trim() || submitting) && { opacity: 0.5 }
                            ]}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dismissArea: {
        flex: 1,
    },
    sheet: {
        height: '70%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
    },
    indicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    username: {
        fontWeight: '600',
        fontSize: 14,
    },
    time: {
        fontSize: 12,
    },
    text: {
        fontSize: 14,
        lineHeight: 20,
    },
    loader: {
        flex: 1,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-end',
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 100,
        fontSize: 15,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
});
