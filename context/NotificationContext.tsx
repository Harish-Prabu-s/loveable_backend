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

        // 1. Notification Channel
        if (!notifWsRef.current) {
            const notifWs = new WebSocketClient('/ws/notifications/', user.id);
            notifWs.on('message', (data) => {
                if (data.type === 'new_notification') {
                    setNewNotification(data.data);
                }
            });
            notifWs.connect();
            notifWsRef.current = notifWs;
        }

        // 2. Chat Channel
        if (!chatWsRef.current) {
            const chatWs = new WebSocketClient('/ws/chat/', user.id);
            chatWs.on('message', (data) => {
                if (data.type === 'new_message' || data.type === 'messages_seen' || data.type === 'typing') {
                    setActiveChatEvent(data);
                }
            });
            chatWs.connect();
            chatWsRef.current = chatWs;
        }

        // 3. Call Channel
        if (!callWsRef.current) {
            const callWs = new WebSocketClient('/ws/call/', user.id);
            callWs.on('message', (data) => {
                if (data.type === 'incoming-call') {
                    setIncomingCall(data);
                }
            });
            callWs.connect();
            callWsRef.current = callWs;
        }

        return () => {
            // We don't necessarily want to close them on Every render, 
            // but the dependency array [token, user.id] ensures this only runs when auth changes.
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
            await chatApi.startCallOnRoom(sessionId);
            setIncomingCall(null);
            router.push({
                pathname: `/call/${callerId}`,
                params: { sessionId: String(sessionId), roomId: roomId ? String(roomId) : String(sessionId), isIncoming: 'true', callType, calleeName: callerName, calleePhoto: callerPhoto }
            } as any);
        } catch (err) {
            console.error('Failed to start call:', err);
            setIncomingCall(null);
        }
    };

    const handleDecline = async () => {
        if (!incomingCall) return;
        const { sessionId } = incomingCall;
        try {
            await chatApi.endCallOnRoom(sessionId, 0, 0);
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
                <Modal transparent visible={!!incomingCall}>
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                        <Animated.View entering={SlideInUp} style={styles.incomingModal}>
                            <View style={styles.modalContent}>
                                <Image source={{ uri: incomingCall.callerPhoto || 'https://via.placeholder.com/100' }} style={styles.avatar} />
                                <Text style={styles.name}>{incomingCall.callerName}</Text>
                                <Text style={styles.type}>Incoming {incomingCall.callType} call...</Text>
                                <View style={styles.actions}>
                                    <TouchableOpacity style={[styles.btn, styles.decline]} onPress={handleDecline}>
                                        <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, styles.accept]} onPress={handleAccept}>
                                        <MaterialCommunityIcons name="phone" size={32} color="white" />
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
    modalContent: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 40, borderRadius: 30, alignItems: 'center', width: '80%' },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
    name: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 10 },
    type: { fontSize: 16, color: '#9CA3AF', marginBottom: 30 },
    actions: { flexDirection: 'row', gap: 40 },
    btn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    decline: { backgroundColor: '#EF4444' },
    accept: { backgroundColor: '#10B981' }
});
