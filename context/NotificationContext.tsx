import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';

interface IncomingCallData {
    sessionId: number;
    callerId: number; // Added
    callerName: string;
    callerPhoto: string | null;
    callType: 'audio' | 'video';
}

interface NotificationContextType {
    incomingCall: IncomingCallData | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user, token } = useAuth();
    const router = useRouter();
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
    const [expoToken, setExpoToken] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);

    useEffect(() => {
        setupNotifications();

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const setupNotifications = async () => {
        try {
            const Notifications = await import('expo-notifications').catch(() => null);
            if (!Notifications) return;

            // Handle foreground notifications
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                console.log('[Notification] Received in foreground:', notification);
                // Can show custom toast here if needed
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('[Notification] Response:', response);
                const data = response.notification.request.content.data;
                handleNotificationClick(data);
            });
        } catch (err) {
            console.warn('[Notification] Setup error:', err);
        }
    };

    const handleNotificationClick = (data: any) => {
        if (!data) return;
        if (data.type === 'post_like' || data.type === 'post_comment') {
            // Navigate to post (logic depends on your app routing)
            router.push('/(tabs)'); 
        } else if (data.type === 'chat_message') {
            router.push(`/chat/${data.sender_id}`);
        } else if (data.type === 'follow') {
            router.push(`/user/${data.user_id}`);
        }
    };

    useEffect(() => {
        console.log(`[WS] Effect trigger - Token: ${!!token}, UserID: ${user?.id}`);

        if (!token || !user?.id) {
            if (wsRef.current) {
                console.log(`[WS] Closing existing socket due to missing credentials. Token: ${!!token}, UserID: ${user?.id}`);
                wsRef.current.close();
                wsRef.current = null;
            } else {
                console.log(`[WS] No socket to connect (waiting for credentials)`);
            }
            return;
        }

        let isCleaningUp = false;

        const connect = () => {
            if (isCleaningUp) return;

            // Use ngrok or your backend URL
            const signalingUrl = `wss://preflagellate-agnus-timidly.ngrok-free.dev/ws/user/${user.id}/`;
            console.log(`[WS] Connecting to ${signalingUrl}...`);
            const ws = new WebSocket(signalingUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log(`[WS] Connected for user ${user.id}`);
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    console.log(`[WS] Received:`, data);
                    if (data.type === 'incoming-call') {
                        setIncomingCall(data);
                    }
                } catch (err) {
                    console.error('[WS] Parse error', err);
                }
            };

            ws.onclose = (e) => {
                console.log(`[WS] Closed for user ${user.id}. Code: ${e.code}, Clean: ${e.wasClean}, Reason: ${e.reason || 'none'}`);
                wsRef.current = null;
                // Only reconnect if not intentionally closed by effect cleanup
                if (!isCleaningUp) {
                    console.log('[WS] Disconnected unexpectedly. Attempting reconnection in 3s...');
                    setTimeout(connect, 3000);
                } else {
                    console.log('[WS] Socket closed intentionally during cleanup');
                }
            };

            ws.onerror = (err: any) => {
                console.warn('[WS] Connection Error for user', user.id, ':', err.message || JSON.stringify(err));
            };
        };

        connect();

        return () => {
            console.log(`[WS] Effect cleanup for user ${user?.id}. Token present: ${!!token}`);
            isCleaningUp = true;
            if (wsRef.current) {
                console.log(`[WS] Closing socket in cleanup`);
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [token, user?.id]);

    const handleAccept = () => {
        if (incomingCall) {
            const { sessionId, callType, callerName, callerPhoto, callerId } = incomingCall;
            setIncomingCall(null);
            router.push({
                pathname: `/call/${callerId}`,
                params: {
                    sessionId,
                    isIncoming: 'true',
                    callType,
                    calleeName: callerName,
                    calleePhoto: callerPhoto
                }
            } as any);
        }
    };

    return (
        <NotificationContext.Provider value={{ incomingCall }}>
            {children}
            {incomingCall && (
                <Modal transparent animationType="none" visible={!!incomingCall}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                        <Animated.View entering={SlideInUp} exiting={FadeOut} style={styles.incomingModal}>
                            <View style={styles.modalContent}>
                                <Image
                                    source={{ uri: incomingCall.callerPhoto || 'https://via.placeholder.com/100' }}
                                    style={styles.avatar}
                                />
                                <Text style={styles.name}>{incomingCall.callerName}</Text>
                                <Text style={styles.type}>Incoming {incomingCall.callType} call...</Text>

                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.decline]}
                                        onPress={() => setIncomingCall(null)}
                                    >
                                        <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.btn, styles.accept]}
                                        onPress={() => {
                                            const call = incomingCall;
                                            setIncomingCall(null);
                                            // Navigation logic needs careful sessionId handling
                                            router.push({
                                                pathname: `/call/${call.callerId}`, // Fixed: use callerId
                                                params: {
                                                    sessionId: call.sessionId,
                                                    isIncoming: 'true',
                                                    callType: call.callType,
                                                    calleeName: call.callerName,
                                                    calleePhoto: call.callerPhoto
                                                }
                                            } as any);
                                        }}
                                    >
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
    incomingModal: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#1E293B',
        borderRadius: 32,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#8B5CF6',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    type: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 40,
    },
    actions: {
        flexDirection: 'row',
        gap: 40,
    },
    btn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decline: {
        backgroundColor: '#EF4444',
    },
    accept: {
        backgroundColor: '#10B981',
    },
});
