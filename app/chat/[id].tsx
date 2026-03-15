import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/authStore';
import { chatApi } from '@/api/chat';
import { profilesApi } from '@/api/profiles';
import { monetizationApi } from '@/api/vibely';
import type { Message as ApiMessage, Room } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { MotiTransitions } from '@/utils/animations';


type UiMessage = {
    id: string;
    text?: string;
    image?: string;
    audio?: boolean;
    gameId?: string;
    gameTitle?: string;
    shareType?: 'post' | 'reel';
    shareId?: number;
    sender: 'me' | 'other';
    timestamp: number;
    type: 'text' | 'image' | 'audio' | 'video' | 'voice' | 'game_invite' | 'post_share' | 'reel_share';
};

export default function ChatScreen() {
    const { id: userIdStr } = useLocalSearchParams();
    const userId = Number(userIdStr);
    const { user } = useAuthStore();
    const isFemale = user?.gender === 'F';

    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [room, setRoom] = useState<Room | null>(null);
    const [otherProfileName, setOtherProfileName] = useState<string>('User');
    const [otherProfilePhoto, setOtherProfilePhoto] = useState<string | null>(null);
    const [presence, setPresence] = useState<'busy' | 'active'>('active');
    const [loading, setLoading] = useState(true);
    const [chatCost, setChatCost] = useState(1); // coin cost per message
    const [replyTo, setReplyTo] = useState<UiMessage | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);

    const toUi = (m: ApiMessage): UiMessage => {
        let type: UiMessage['type'] = 'text';
        let gameId, gameTitle;

        if (m.type === 'text' && m.content.startsWith('[GAME_INVITE:')) {
            type = 'game_invite';
            const parts = m.content.split(':');
            gameId = parts[1];
            gameTitle = parts[2]?.replace(']', '');
        } else if (m.type === 'voice') {
            type = 'audio' as any;
        } else if (m.type === 'post_share' && m.content.startsWith('[POST_SHARE:')) {
            type = 'post_share';
            const postId = m.content.match(/\[POST_SHARE:(\d+)\]/)?.[1];
            return {
                id: String(m.id),
                shareType: 'post',
                shareId: postId ? Number(postId) : undefined,
                sender: Number(m.sender) === Number(user?.id) ? 'me' : 'other',
                timestamp: new Date(m.created_at).getTime(),
                type,
            };
        } else if (m.type === 'reel_share' && m.content.startsWith('[REEL_SHARE:')) {
            type = 'reel_share';
            const reelId = m.content.match(/\[REEL_SHARE:(\d+)\]/)?.[1];
            return {
                id: String(m.id),
                shareType: 'reel',
                shareId: reelId ? Number(reelId) : undefined,
                sender: Number(m.sender) === Number(user?.id) ? 'me' : 'other',
                timestamp: new Date(m.created_at).getTime(),
                type,
            };
        } else {
            type = m.type as any;
        }

        return {
            id: String(m.id),
            text: m.content,
            image: (m.type === 'image' || m.type === 'video' || m.type === 'voice' || m.type === 'audio') ? m.media_url : undefined,
            audio: m.type === 'audio' || m.type === 'voice',
            gameId,
            gameTitle,
            sender: Number(m.sender) === Number(user?.id) ? 'me' : 'other',
            timestamp: new Date(m.created_at).getTime(),
            type,
        };
    };

    useEffect(() => {
        const init = async () => {
            try {
                if (!userId || isNaN(userId)) return;

                try {
                    const p = await profilesApi.getById(userId);
                    setOtherProfileName(p.display_name || `User #${userId}`);
                    setOtherProfilePhoto(p.photo || null);
                } catch (e) {
                    console.error(e);
                }

                try {
                    const pr = await chatApi.getPresence(userId);
                    setPresence(pr.status);
                } catch (e) {
                    console.error(e);
                }

                const r = await chatApi.createRoom(userId);
                setRoom(r);
                const msgs = await chatApi.getMessages(r.id);
                setMessages(msgs.map(toUi));
            } catch (e) {
                console.error('chat init error', e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [userId, user?.id]);

    // Load chat pricing from DB
    useEffect(() => {
        monetizationApi.getPricing('chat').then(d => setChatCost(d.cost || 1)).catch(() => { });
    }, []);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !room) return;

        const textToSend = inputValue;

        // Add optimistic message
        const newMessage: UiMessage = {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'me',
            timestamp: Date.now(),
            type: 'text',
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue("");
        setReplyTo(null);

        // Scroll to bottom immediately
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            await chatApi.sendMessage(room.id, textToSend);
        } catch (e) {
            console.error('send message error', e);
            Alert.alert('Error', 'Failed to send message');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                        </TouchableOpacity>

                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: otherProfilePhoto || `https://i.pravatar.cc/150?u=${userId}` }}
                                style={styles.avatar}
                            />
                            <View style={[styles.statusBadge, { backgroundColor: presence === 'busy' ? '#EF4444' : '#22C55E' }]} />
                        </View>

                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName}>{otherProfileName}</Text>
                            <Text style={[styles.statusText, { color: presence === 'busy' ? '#EF4444' : '#22C55E' }]}>
                                {presence === 'busy' ? 'In Call' : 'Active'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton} onPress={() =>
                            router.push({ pathname: '/call/[id]' as any, params: { id: userId, callType: 'audio', calleeName: otherProfileName } })
                        }>
                            <MaterialCommunityIcons name="phone" size={24} color="#8B5CF6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() =>
                            router.push({ pathname: '/call/[id]' as any, params: { id: userId, callType: 'video', calleeName: otherProfileName } })
                        }>
                            <MaterialCommunityIcons name="video" size={24} color="#8B5CF6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <MaterialCommunityIcons name="dots-vertical" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Security Banner */}
                <View style={styles.securityBanner}>
                    <MaterialCommunityIcons name="lock" size={12} color="#854D0E" />
                    <Text style={styles.securityText}>Messages are end-to-end encrypted.</Text>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    <AnimatePresence>
                        {messages.map((msg, index) => {
                            const isMe = msg.sender === 'me';
                            return (
                                <MotiView
                                    key={msg.id}
                                    from={{ opacity: 0, translateY: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, translateY: 0, scale: 1 }}
                                    transition={{
                                        type: 'spring',
                                        damping: 20,
                                        stiffness: 200,
                                        // Delay only for initial load if we want, or for all
                                        delay: index > messages.length - 5 ? 0 : 50,
                                    }}
                                    style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
                                >
                                    <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                                        {msg.type === 'text' && (
                                            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                                                {msg.text}
                                            </Text>
                                        )}
                                        {msg.type === 'image' && msg.image && (
                                            <Image source={{ uri: msg.image }} style={styles.messageImage} />
                                        )}
                                        {(msg.type === 'post_share' || msg.type === 'reel_share') && (
                                            <TouchableOpacity 
                                                style={styles.shareCard}
                                                onPress={() => {
                                                    if (msg.shareType === 'post') {
                                                        router.push({ pathname: '/post/[id]' as any, params: { id: msg.shareId } });
                                                    } else {
                                                        router.push({ pathname: '/reels' as any, params: { reelId: msg.shareId } });
                                                    }
                                                }}
                                            >
                                                <View style={styles.shareCardHeader}>
                                                    <MaterialCommunityIcons 
                                                        name={msg.shareType === 'post' ? "image-outline" : "movie-play-outline"} 
                                                        size={20} 
                                                        color={isMe ? "#FFFFFF" : "#8B5CF6"} 
                                                    />
                                                    <Text style={[styles.shareCardTitle, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                                                        Shared {msg.shareType}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.shareCardAction, isMe ? styles.messageTextMe : { color: '#8B5CF6' }]}>
                                                    Tap to view
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </MotiView>
                            );
                        })}
                    </AnimatePresence>
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
                        <MaterialCommunityIcons name="plus" size={24} color="#64748B" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        value={inputValue}
                        onChangeText={setInputValue}
                        placeholder="Type a message..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        maxLength={500}
                    />

                    {inputValue.trim() ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={MotiTransitions.bounce}
                        >
                            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </MotiView>
                    ) : (
                        <TouchableOpacity style={styles.micButton}>
                            <MaterialCommunityIcons name="microphone" size={24} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    headerInfo: {
        justifyContent: 'center',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF9C3',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#FEF08A',
    },
    securityText: {
        fontSize: 11,
        color: '#854D0E',
        marginLeft: 6,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 24,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    messageRowMe: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 20,
        // Add subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageBubbleMe: {
        backgroundColor: '#8B5CF6',
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageTextMe: {
        color: '#FFFFFF',
    },
    messageTextOther: {
        color: '#0F172A',
    },
    messageImage: {
        width: 240,
        height: 180,
        borderRadius: 12,
        marginBottom: 4,
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    timeTextMe: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    timeTextOther: {
        color: '#94A3B8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    attachButton: {
        padding: 10,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        minHeight: 45,
        maxHeight: 120,
        marginHorizontal: 8,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sendButton: {
        backgroundColor: '#8B5CF6',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    micButton: {
        padding: 10,
        marginBottom: 2,
    },
    shareCard: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        minWidth: 150,
    },
    shareCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    shareCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    shareCardAction: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
});
