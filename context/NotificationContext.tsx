import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { WebSocketClient } from '@/utils/websocket';
import { chatApi } from '@/api/chat';
import { callsApi } from '@/api/vibely';

interface IncomingCallData {
    sessionId: number;
    roomId?: string;
    callerId: number;
    callerName: string;
    callerPhoto: string | null;
    callType: 'audio' | 'video';
}

interface NotificationContextType {
    incomingCall: IncomingCallData | null;
    newNotification: any | null;
    activeChatEvent: any | null;
    globalUnreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    clearUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user, token } = useAuth();
    const router = useRouter();
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
    const [newNotification, setNewNotification] = useState<any | null>(null);
    const [activeChatEvent, setActiveChatEvent] = useState<any | null>(null);
    const [globalUnreadCount, setGlobalUnreadCount] = useState(0);

    const refreshUnreadCount = async () => {
        try {
            const { notificationsApi } = await import('@/api/notifications');
            const count = await notificationsApi.getUnreadCount();
            setGlobalUnreadCount(count);
        } catch { }
    };

    const clearUnreadCount = () => {
        setGlobalUnreadCount(0);
    };

    useEffect(() => {
        if (newNotification) {
            setGlobalUnreadCount(prev => prev + 1);
        }
    }, [newNotification]);
    
    const notifWsRef = useRef<WebSocketClient | null>(null);
    const chatWsRef = useRef<WebSocketClient | null>(null);
    const callWsRef = useRef<WebSocketClient | null>(null);

    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        setupNotifications();
        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    const setupNotifications = async () => {
        try {
            if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
            const Notifications = await import('expo-notifications').catch(() => null);
            if (!Notifications) return;

            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            notificationListener.current = Notifications.addNotificationReceivedListener(n => console.log('Notif Recv:', n));
            responseListener.current = Notifications.addNotificationResponseReceivedListener(r => {
                const data = r.notification.request.content.data;
                if (data.type === 'chat_message') router.push(`/chat/${data.sender_id}`);
                if (data.type === 'mention') {
                    if (data.post_id) router.push(`/post/${data.post_id}` as any);
                    else if (data.reel_id) router.push(`/reel/${data.reel_id}` as any);
                    else if (data.story_id) router.push(`/story/${data.story_id}` as any);
                }
            });
        } catch (err) {
            console.warn('Push setup error:', err);
        }
    };

    useEffect(() => {
        if (!token || !user?.id) {
            notifWsRef.current?.close();
            chatWsRef.current?.close();
            callWsRef.current?.close();
            notifWsRef.current = null;
            chatWsRef.current = null;
            callWsRef.current = null;
            return;
        }

        // 1. Notification Channel — pass token for JWTAuthMiddleware
        if (!notifWsRef.current) {
            const notifWs = new WebSocketClient('/ws/notifications/', user.id, token);
            notifWs.on('message', (data) => {
                if (data.type === 'new_notification') {
                    setNewNotification(data.data);
                }
            });
            notifWs.connect();
            notifWsRef.current = notifWs;
        }

        // 2. Chat Channel — pass token for JWTAuthMiddleware
        if (!chatWsRef.current) {
            const chatWs = new WebSocketClient('/ws/chat/', user.id, token);
            chatWs.on('message', (data) => {
                if (data.type === 'new_message' || data.type === 'messages_seen' || data.type === 'typing') {
                    setActiveChatEvent(data);
                }
            });
            chatWs.connect();
            chatWsRef.current = chatWs;
        }

        // 3. Call Channel — pass token for JWTAuthMiddleware
        // This receives incoming-call events sent by services.py when someone calls this user
        if (!callWsRef.current) {
            const callWs = new WebSocketClient('/ws/call/', user.id, token);
            callWs.on('message', (data) => {
                console.log('[CallWS] Received message:', data.type);
                if (data.type === 'incoming-call') {
                    console.log('[CallWS] Incoming call from:', data.callerName, '| Room:', data.roomId);
                    setIncomingCall({
                        sessionId: data.sessionId,
                        // Use the roomId from the caller's initiate request.
                        // CRITICAL: If roomId is missing, fall back to sessionId as string.
                        // The caller uses the same fallback on their side.
                        roomId: data.roomId ? String(data.roomId) : String(data.sessionId),
                        callerId: data.callerId,
                        callerName: data.callerName,
                        callerPhoto: data.callerPhoto,
                        callType: data.callType,
                    });
                }
            });
            callWs.connect();
            callWsRef.current = callWs;
        }

        return () => {
            notifWsRef.current?.close();
            chatWsRef.current?.close();
            callWsRef.current?.close();
            notifWsRef.current = null;
            chatWsRef.current = null;
            callWsRef.current = null;
        };
    }, [token, user?.id]);

    const handleAccept = async () => {
        if (!incomingCall) return;
        const { sessionId, roomId, callType, callerName, callerPhoto, callerId } = incomingCall;
        try {
            await callsApi.accept(sessionId);
            setIncomingCall(null);
            // Navigate to call screen with the EXACT roomId from the caller
            router.push({
                pathname: `/call/${callerId}`,
                params: {
                    sessionId: String(sessionId),
                    roomId: roomId,           // This is now always a string (never undefined)
                    isIncoming: 'true',
                    callType,
                    calleeName: callerName,
                    calleePhoto: callerPhoto ?? '',
                }
            } as any);
        } catch (err) {
            console.error('Failed to accept call:', err);
            setIncomingCall(null);
        }
    };

    const handleDecline = async () => {
        if (!incomingCall) return;
        const { sessionId } = incomingCall;
        try {
            await callsApi.end(sessionId);
        } catch (err) {
            console.error('Failed to decline call:', err);
        } finally {
            setIncomingCall(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ incomingCall, newNotification, activeChatEvent, globalUnreadCount, refreshUnreadCount, clearUnreadCount }}>
            {children}
            {incomingCall && (
                <Modal transparent visible={!!incomingCall} statusBarTranslucent>
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                        <Animated.View entering={SlideInUp} style={styles.incomingModal}>
                            <View style={styles.modalContent}>
                                {/* Animated avatar pulse */}
                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatarRing} />
                                    <Image
                                        source={{ uri: incomingCall.callerPhoto || 'https://via.placeholder.com/100' }}
                                        style={styles.avatar}
                                    />
                                </View>
                                <Text style={styles.name}>{incomingCall.callerName}</Text>
                                <Text style={styles.type}>
                                    Incoming {incomingCall.callType === 'video' ? '📹 Video' : '📞 Audio'} Call
                                </Text>
                                <View style={styles.actions}>
                                    <TouchableOpacity style={[styles.btn, styles.decline]} onPress={handleDecline} activeOpacity={0.8}>
                                        <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
                                        <Text style={styles.btnLabel}>Decline</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, styles.accept]} onPress={handleAccept} activeOpacity={0.8}>
                                        <MaterialCommunityIcons name="phone" size={32} color="white" />
                                        <Text style={styles.btnLabel}>Accept</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    </BlurView>
                </Modal>
            )}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

const styles = StyleSheet.create({
    incomingModal: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContent: {
        backgroundColor: 'rgba(15,15,30,0.85)',
        padding: 40,
        borderRadius: 30,
        alignItems: 'center',
        width: '85%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    avatarContainer: { position: 'relative', marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    avatarRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#10B981',
        opacity: 0.6,
    },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#10B981' },
    name: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    type: { fontSize: 16, color: '#9CA3AF', marginBottom: 36 },
    actions: { flexDirection: 'row', gap: 40 },
    btn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    btnLabel: { color: 'white', fontSize: 12, marginTop: 4 },
    decline: { backgroundColor: '#EF4444' },
    accept: { backgroundColor: '#10B981' },
});
