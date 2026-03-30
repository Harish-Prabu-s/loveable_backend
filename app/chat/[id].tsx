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
import { useNotifications } from '@/context/NotificationContext';
import type { Message as ApiMessage, Room } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Switch, Modal, FlatList } from 'react-native';
import { MotiTransitions } from '@/utils/animations';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { walletApi } from '@/api/wallet';
import { giftsApi } from '@/api/gifts';
import { useSecurityStore } from '@/store/securityStore';

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
    is_seen?: boolean;
    expires_at?: string | null;
};

export default function ChatScreen() {
    const { id: userIdStr } = useLocalSearchParams();
    const userId = Number(userIdStr);
    console.log(`[Chat] userIdStr: ${userIdStr}, userId: ${userId}`);
    const { user } = useAuthStore();
    const { activeChatEvent } = useNotifications();
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

    const [disappearingEnabled, setDisappearingEnabled] = useState(false);
    const [disappearingTimer, setDisappearingTimer] = useState(0);

    // New states for attachments and charging
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [gifts, setGifts] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);

    const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

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
            type = 'voice';
        } else if (m.type === 'video') {
            type = 'video';
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

        const senderId = typeof m.sender === 'object' && m.sender !== null ? (m.sender as any).id : m.sender;
        console.log(`[Chat Debug] Msg ID: ${m.id} | raw sender: ${JSON.stringify(m.sender)} | extracted senderId: ${senderId} | current userId: ${user?.id} | isMe: ${Number(senderId) === Number(user?.id)}`);

        return {
            id: String(m.id),
            text: m.content,
            image: (m.type === 'image' || m.type === 'video' || m.type === 'voice' || m.type === 'audio') ? m.media_url : undefined,
            audio: m.type === 'audio' || m.type === 'voice',
            gameId,
            gameTitle,
            sender: Number(senderId) === Number(user?.id) ? 'me' : 'other',
            timestamp: new Date(m.created_at).getTime(),
            type,
            is_seen: m.is_seen,
            expires_at: m.expires_at,
        };
    };

    useEffect(() => {
        // Interval to clean up expired messages in the UI eagerly 
        const interval = setInterval(() => {
            setMessages(prev => prev.filter(m => {
                if(m.expires_at) {
                    const expiry = new Date(m.expires_at).getTime();
                    if(Date.now() >= expiry) {
                        return false;
                    }
                }
                return true;
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Handle incoming WebSockets from NotificationContext
    useEffect(() => {
        if(!activeChatEvent || !room) return;
        
        if (activeChatEvent.type === 'new_message' && activeChatEvent.message?.room === room.id) {
            const raw = activeChatEvent.message;
            // Prevent duplicates
            setMessages(prev => {
                if(prev.find(m => m.id === String(raw.id))) return prev;
                return [...prev, toUi(raw)];
            });
            // Mark new immediately seen
            chatApi.markSeen(room.id).catch(console.error);

            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } else if (activeChatEvent.type === 'messages_seen' && activeChatEvent.room_id === room.id) {
            // Re-fetch room messages to get updated expiry timers
            chatApi.getMessages(room.id).then(msgs => setMessages(msgs.map(toUi))).catch(console.error);
        }
    }, [activeChatEvent]);

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
                setDisappearingEnabled(!!r.disappearing_messages_enabled);
                setDisappearingTimer(r.disappearing_timer || 0);

                const msgs = await chatApi.getMessages(r.id);
                setMessages(msgs.map(toUi));
                
                // Mark loaded messages as seen
                await chatApi.markSeen(r.id);
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

        // Check text message cost (1 coin)
        if (walletBalance < 1 && !isFemale) {
            Alert.alert("Insufficient Coins", "You need 1 coin to send a message.");
            return;
        }

        const textToSend = inputValue;
        // ... rest of the send logic

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
            const m = await chatApi.sendMessage(room.id, textToSend);
            
            // Re-fetch balance after successful send
            fetchWalletBalance();

            // Re-map the new message to UI format securely
            const uiMsg = toUi(m);
            setMessages(prev => {
                const newArr = [...prev];
                const idx = newArr.findIndex(x => x.id === newMessage.id);
                if(idx >= 0) {
                    newArr[idx] = uiMsg; 
                }
                return newArr;
            });
            
        } catch (e: any) {
            console.error('send message error', e);
            if (e.response?.status === 402) {
                Alert.alert('Insufficient Balance', 'Please recharge your wallet.');
            } else {
                Alert.alert('Error', 'Failed to send message');
            }
        }
    };

    const fetchWalletBalance = async () => {
        try {
            const res = await walletApi.getWallet();
            setWalletBalance(res.coin_balance || 0);
        } catch (e) {}
    };

    useEffect(() => {
        fetchWalletBalance();
        // Load gifts
        giftsApi.getGifts().then(setGifts).catch(() => {});

        return () => {
            if (playingSound) {
                playingSound.unloadAsync();
            }
        };
    }, []);

    // --- Media & Voice Functions ---

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Timer
            const interval = setInterval(() => {
                setRecordingDuration(d => d + 1);
            }, 1000);
            (recording as any)._timer = interval;

        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        clearInterval((recording as any)._timer);
        
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri) {
                // Confirm 5 coins cost
                Alert.alert(
                    "Send Voice Message?",
                    "This will cost 5 coins.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Send", onPress: () => sendMediaMessage(uri, 'voice', recordingDuration) }
                    ]
                );
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
        setRecording(null);
    };

    const { setBypassLock } = useSecurityStore();

    const pickMedia = async (type: 'image' | 'video', useCamera: boolean) => {
        setBypassLock(true);
        let result = null;
        try {
            result = useCamera 
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 0.8,
                    videoMaxDuration: 15, // 15s limit
                })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 0.8,
                    videoMaxDuration: 15,
                });
        } finally {
            // Slight delay to ensure AppState logic has resolved before un-bypassing
            setTimeout(() => setBypassLock(false), 1000);
        }

        if (result && !result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            
            // Check video duration specifically for library picks that might bypass editing
            if (type === 'video' && asset.duration && asset.duration > 15000) {
                Alert.alert("Too Long", "Videos are limited to 15 seconds.");
                return;
            }

            const cost = type === 'image' ? 5 : 10;
            Alert.alert(
                `Send ${type}?`,
                `This will cost ${cost} coins.`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Send", onPress: () => sendMediaMessage(asset.uri, type) }
                ]
            );
        }
        setShowAttachmentMenu(false);
    };

    const sendMediaMessage = async (uri: string, type: 'image' | 'video' | 'voice', duration?: number) => {
        if (!room) return;
        try {
            setLoading(true);
            
            // 1. Upload
            const file: any = {
                uri,
                name: `upload_${Date.now()}.${type === 'voice' ? 'm4a' : type === 'image' ? 'jpg' : 'mp4'}`,
                type: type === 'voice' ? 'audio/m4a' : type === 'image' ? 'image/jpeg' : 'video/mp4'
            };
            
            const uploadRes = await chatApi.uploadMedia(file, type === 'voice' ? 'voice' : type);
            
            // 2. Send Message
            const m = await chatApi.sendMessage(
                room.id, 
                `[${type.toUpperCase()}_MESSAGE]`, 
                type === 'voice' ? 'voice' : type, 
                uploadRes.url, 
                duration || 0
            );
            
            setMessages(prev => [...prev, toUi(m)]);
            fetchWalletBalance();
        } catch (e: any) {
            console.error('send media message error', e);
            if (e.response?.status === 402) {
                Alert.alert('Insufficient Balance', 'Please recharge your wallet.');
            } else {
                Alert.alert('Error', 'Failed to send file');
            }
        } finally {
            setLoading(false);
        }
    };

    const sendGift = async (gift: any) => {
        if (!room) return;
        try {
            setShowGiftModal(false);
            setLoading(true);
            
            await giftsApi.sendGift(gift.id, userId);

            // Add a virtual message for the gift in UI
            const m = await chatApi.sendMessage(room.id, `Sent a ${gift.icon} ${gift.name}`, 'text');
            setMessages(prev => [...prev, toUi(m)]);
            
            fetchWalletBalance();
            Alert.alert("Success", `Sent ${gift.name}!`);
        } catch (e: any) {
            console.error('send gift error', e);
            Alert.alert("Error", "Failed to send gift.");
        } finally {
            setLoading(false);
        }
    };

    const playVoiceMessage = async (uri: string, messageId: string) => {
        try {
            if (playingSound) {
                await playingSound.unloadAsync();
                setPlayingSound(null);
                if (playingMessageId === messageId) {
                    setPlayingMessageId(null);
                    return;
                }
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );
            
            setPlayingSound(sound);
            setPlayingMessageId(messageId);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlayingMessageId(null);
                    setPlayingSound(null);
                }
            });

        } catch (e) {
            console.error('play voice error', e);
        }
    };
    
    const toggleDisappearing = async (value: boolean) => {
        if(!room) return;
        try {
            setDisappearingEnabled(value);
            const timer = value ? 5 : 0; // default 5 seconds
            setDisappearingTimer(timer);
            await chatApi.toggleDisappearing(room.id, value, timer);
        } catch(e) {
            // Revert on error
            setDisappearingEnabled(!value);
            Alert.alert("Error", "Could not toggle settings.");
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
                        <TouchableOpacity style={[styles.iconButton, { marginRight: 4 }]} onPress={() =>
                            router.push({ pathname: '/game/matchmaking', params: { coupleTarget: userId, coupleName: otherProfileName } })
                        }>
                            <MaterialCommunityIcons name="gamepad-variant-outline" size={24} color="#EC4899" />
                        </TouchableOpacity>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 4}}>
                            <MaterialCommunityIcons name="timer-sand" size={18} color={disappearingEnabled ? "#8B5CF6" : "#64748B"} />
                            <Switch 
                                value={disappearingEnabled}
                                onValueChange={toggleDisappearing}
                                thumbColor={disappearingEnabled ? '#8B5CF6' : '#94A3B8'}
                                trackColor={{false: '#334155', true: '#C4B5FD'}}
                                style={{transform: [{scaleX: .7}, {scaleY: .7}], marginLeft: 2}}
                            />
                        </View>
                        <TouchableOpacity style={styles.iconButton} onPress={() =>
                            router.push({
                                pathname: '/call/[id]',
                                params: {
                                    id: userId,
                                    callType: 'VOICE',
                                    calleeName: otherProfileName,
                                    calleePhoto: otherProfilePhoto || ''
                                }
                            } as any)
                        }>
                            <MaterialCommunityIcons name="phone" size={24} color="#8B5CF6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() =>
                            router.push({
                                pathname: '/call/[id]',
                                params: {
                                    id: userId,
                                    callType: 'VIDEO',
                                    calleeName: otherProfileName,
                                    calleePhoto: otherProfilePhoto || ''
                                }
                            } as any)
                        }>
                            <MaterialCommunityIcons name="video" size={24} color="#8B5CF6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() =>
                            router.push({
                                pathname: '/call/raw/[id]',
                                params: {
                                    id: userId,
                                    calleeName: otherProfileName,
                                }
                            } as any)
                        }>
                            <MaterialCommunityIcons name="shield-check" size={24} color="#F59E0B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={() => setShowGiftModal(true)}>
                            <MaterialCommunityIcons name="gift-outline" size={24} color="#EC4899" />
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
                                            <TouchableOpacity onPress={() => router.push({ pathname: '/media-viewer', params: { uri: msg.image, type: 'image' } })}>
                                                <Image source={{ uri: msg.image }} style={styles.messageImage} />
                                            </TouchableOpacity>
                                        )}
                                        {msg.type === 'video' && msg.image && (
                                            <TouchableOpacity 
                                                style={styles.mediaContainer} 
                                                onPress={() => router.push({ pathname: '/media-viewer', params: { uri: msg.image, type: 'video' } })}
                                            >
                                                <Image source={{ uri: msg.image }} style={styles.messageImage} />
                                                <View style={styles.playOverlay}>
                                                    <MaterialCommunityIcons name="play-circle" size={48} color="#FFFFFF" />
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        {msg.type === 'voice' && (
                                            <TouchableOpacity 
                                                style={styles.voiceContainer} 
                                                onPress={() => msg.image && playVoiceMessage(msg.image, msg.id)}
                                            >
                                                <MaterialCommunityIcons 
                                                    name={playingMessageId === msg.id ? "pause" : "play"} 
                                                    size={24} 
                                                    color={isMe ? "#FFFFFF" : "#8B5CF6"} 
                                                />
                                                <View style={styles.voiceWaveform}>
                                                    <View style={[styles.waveformBar, { height: 12, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : '#E2E8F0' }]} />
                                                    <View style={[styles.waveformBar, { height: 20, backgroundColor: isMe ? 'rgba(255,255,255,0.6)' : '#CBD5E1' }]} />
                                                    <View style={[styles.waveformBar, { height: 16, backgroundColor: isMe ? '#FFFFFF' : '#8B5CF6' }]} />
                                                    <View style={[styles.waveformBar, { height: 24, backgroundColor: isMe ? 'rgba(255,255,255,0.6)' : '#CBD5E1' }]} />
                                                    <View style={[styles.waveformBar, { height: 14, backgroundColor: isMe ? 'rgba(255,255,255,0.4)' : '#E2E8F0' }]} />
                                                </View>
                                                <Text style={[styles.voiceDurationText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                                                    {msg.text?.includes('Recording') ? msg.text.split(' ')[1] : 'Voice'}
                                                </Text>
                                            </TouchableOpacity>
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
                                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start'}}>
                                            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            
                                            {/* Disappearing Message Timer Indicator */}
                                            {msg.expires_at && (
                                                <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 6}}>
                                                    <MaterialCommunityIcons name="timer-sand" size={12} color={isMe ? "rgba(255,255,255,0.7)" : "#94A3B8"} />
                                                    <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther, {marginLeft: 2}]}>
                                                        {Math.max(0, Math.floor((new Date(msg.expires_at).getTime() - Date.now()) / 1000))}s
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </MotiView>
                            );
                        })}
                    </AnimatePresence>
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    {isRecording ? (
                        <View style={styles.recordingContainer}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={styles.recordingDot}
                            />
                            <Text style={styles.recordingText}>Recording {recordingDuration}s...</Text>
                            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                                <Text style={styles.stopButtonText}>Stop</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity 
                                style={styles.attachButton} 
                                onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
                            >
                                <MaterialCommunityIcons 
                                    name={showAttachmentMenu ? "close" : "plus"} 
                                    size={24} 
                                    color={showAttachmentMenu ? "#EF4444" : "#64748B"} 
                                />
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
                                <TouchableOpacity 
                                    style={styles.micButton} 
                                    onLongPress={startRecording}
                                    onPress={() => Alert.alert("Hold to record", "Long press the microphone to record a voice message.")}
                                >
                                    <MaterialCommunityIcons name="microphone" size={24} color="#8B5CF6" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

                {/* Attachment Menu */}
                <AnimatePresence>
                    {showAttachmentMenu && (
                        <MotiView
                            from={{ opacity: 0, translateY: 100 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            exit={{ opacity: 0, translateY: 100 }}
                            style={styles.attachmentMenu}
                        >
                            <View style={styles.attachmentRow}>
                                <TouchableOpacity style={styles.attachmentItem} onPress={() => pickMedia('image', true)}>
                                    <View style={[styles.attachmentIcon, { backgroundColor: '#F0F9FF' }]}>
                                        <MaterialCommunityIcons name="camera" size={24} color="#0EA5E9" />
                                    </View>
                                    <Text style={styles.attachmentLabel}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.attachmentItem} onPress={() => pickMedia('image', false)}>
                                    <View style={[styles.attachmentIcon, { backgroundColor: '#F5F3FF' }]}>
                                        <MaterialCommunityIcons name="image" size={24} color="#8B5CF6" />
                                    </View>
                                    <Text style={styles.attachmentLabel}>Gallery</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.attachmentItem} onPress={() => pickMedia('video', true)}>
                                    <View style={[styles.attachmentIcon, { backgroundColor: '#FFF7ED' }]}>
                                        <MaterialCommunityIcons name="video" size={24} color="#F97316" />
                                    </View>
                                    <Text style={styles.attachmentLabel}>Video</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.attachmentItem} onPress={() => pickMedia('video', false)}>
                                    <View style={[styles.attachmentIcon, { backgroundColor: '#F0FDF4' }]}>
                                        <MaterialCommunityIcons name="movie" size={24} color="#22C55E" />
                                    </View>
                                    <Text style={styles.attachmentLabel}>Video Gal</Text>
                                </TouchableOpacity>
                            </View>
                        </MotiView>
                    )}
                </AnimatePresence>

                {/* Gift Modal */}
                <Modal
                    visible={showGiftModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowGiftModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.giftModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Send a Gift</Text>
                                <TouchableOpacity onPress={() => setShowGiftModal(false)}>
                                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            
                            <FlatList
                                data={gifts}
                                keyExtractor={(item) => String(item.id)}
                                numColumns={3}
                                contentContainerStyle={styles.giftList}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.giftItem} onPress={() => sendGift(item)}>
                                        <Text style={styles.giftIcon}>{item.icon}</Text>
                                        <Text style={styles.giftName}>{item.name}</Text>
                                        <View style={styles.giftCostRow}>
                                            <MaterialCommunityIcons name="database" size={14} color="#F59E0B" />
                                            <Text style={styles.giftCost}>{item.cost}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                            
                            <View style={styles.walletBar}>
                                <Text style={styles.walletText}>Balance: {walletBalance} coins</Text>
                                <TouchableOpacity style={styles.rechargeButton}>
                                    <Text style={styles.rechargeText}>Recharge</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
    // New Styles
    recordingContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        marginRight: 8,
    },
    recordingText: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600',
    },
    stopButton: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    stopButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    attachmentMenu: {
        position: 'absolute',
        bottom: 80,
        left: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    attachmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    attachmentItem: {
        alignItems: 'center',
    },
    attachmentIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachmentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    giftModal: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: '50%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    giftList: {
        padding: 16,
    },
    giftItem: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        margin: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    giftIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    giftName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    giftCostRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    giftCost: {
        fontSize: 12,
        fontWeight: '800',
        color: '#F59E0B',
        marginLeft: 4,
    },
    walletBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#F8FAFC',
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    walletText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    rechargeButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    rechargeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    mediaContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    voiceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        minWidth: 120,
    },
    voiceWaveform: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
        height: 30,
    },
    waveformBar: {
        width: 3,
        borderRadius: 1.5,
        marginHorizontal: 1,
    },
    voiceDurationText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
