import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ActivityIndicator, Dimensions, ScrollView, TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RTCView } from '@/utils/webrtc.native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { useEnterpriseCall } from '@/hooks/useEnterpriseCall';

const { width } = Dimensions.get('window');

export default function SFUCallScreen() {
    const { id, calleeName } = useLocalSearchParams<{ id: string; calleeName: string }>();
    const { status, localStream, participants, messages, sendMessage, endCall } = useEnterpriseCall(id);
    
    const [inputText, setInputText] = React.useState('');
    const [showChat, setShowChat] = React.useState(false);

    const handleSendMessage = () => {
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText('');
        }
    };

    const handleEndCall = () => {
        endCall();
        router.back();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            
            {/* Grid for Participants */}
            <View style={styles.remoteContainer}>
                {participants.length > 0 ? (
                    <View style={styles.grid}>
                        {participants.map(p => (
                           <View key={p.userId} style={styles.gridItem}>
                               {p.videoTrack ? (
                                   <RTCView
                                      streamURL={p.videoTrack.toURL?.() || ''}
                                      style={styles.fullVideo}
                                      objectFit="cover"
                                   />
                               ) : (
                                   <View style={styles.noVideo}>
                                      <MaterialCommunityIcons name="account" size={60} color="#475569" />
                                      <Text style={styles.nameOverlay}>{p.displayName || `User ${p.userId}`}</Text>
                                   </View>
                               )}
                           </View>
                        ))}
                    </View>
                ) : (
                    <LinearGradient colors={['#0F172A', '#020617']} style={styles.fullVideo}>
                        <ActivityIndicator color="#6366F1" size="large" />
                        <Text style={styles.waitingText}>Connecting SFU Media for {calleeName}...</Text>
                    </LinearGradient>
                )}
            </View>

            {/* Local Video (PiP) */}
            <View style={styles.localContainer}>
                {localStream ? (
                    <RTCView
                        streamURL={localStream.toURL?.() || ''}
                        style={styles.localVideo}
                        objectFit="cover"
                        zOrder={1}
                    />
                ) : (
                    <View style={[styles.localVideo, { backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="video-off" size={24} color="#94A3B8" />
                    </View>
                )}
            </View>

            {/* Controls */}
            <SafeAreaView style={styles.controls}>
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={handleEndCall}>
                        <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.controlBtn, { backgroundColor: showChat ? '#6366F1' : 'rgba(255,255,255,0.2)' }]} 
                        onPress={() => setShowChat(!showChat)}
                    >
                        <MaterialCommunityIcons name="chat" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Chat Overlay */}
            <AnimatePresence>
                {showChat && (
                    <MotiView
                        from={{ translateY: 400 }}
                        animate={{ translateY: 0 }}
                        exit={{ translateY: 400 }}
                        style={styles.chatSheet}
                    >
                        <View style={styles.chatHeader}>
                            <Text style={styles.chatTitle}>Room Chat</Text>
                            <TouchableOpacity onPress={() => setShowChat(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.messageScroll}>
                            {messages.map(m => {
                                const isMe = participants.find(p => p.userId === m.userId) == null;
                                return (
                                <View key={m.id} style={[styles.bubble, isMe ? styles.myBubble : styles.peerBubble]}>
                                    <Text style={styles.bubbleText}>{m.text}</Text>
                                </View>
                            )})}
                        </ScrollView>

                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Type a message..."
                                placeholderTextColor="#64748B"
                            />
                            <TouchableOpacity onPress={handleSendMessage}>
                                <MaterialCommunityIcons name="send" size={24} color="#6366F1" />
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                )}
            </AnimatePresence>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    remoteContainer: { ...StyleSheet.absoluteFillObject },
    grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { flex: 1, minWidth: '50%', minHeight: '50%', position: 'relative' },
    noVideo: { flex: 1, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderColor: '#000', borderWidth: 1 },
    nameOverlay: { color: '#FFF', position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 5 },
    fullVideo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    waitingText: { color: '#94A3B8', marginTop: 12 },
    localContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
        borderWidth: 2,
        borderColor: '#6366F1'
    },
    localVideo: { flex: 1 },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    controlBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    endBtn: { backgroundColor: '#EF4444' },
    chatSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 400,
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    chatTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    messageScroll: { flex: 1 },
    bubble: { padding: 10, borderRadius: 12, marginBottom: 8, maxWidth: '80%' },
    myBubble: { alignSelf: 'flex-end', backgroundColor: '#6366F1' },
    peerBubble: { alignSelf: 'flex-start', backgroundColor: '#1E293B' },
    bubbleText: { color: '#FFF' },
    inputArea: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    input: { flex: 1, height: 44, backgroundColor: '#1E293B', borderRadius: 22, paddingHorizontal: 15, color: '#FFF' }
});
