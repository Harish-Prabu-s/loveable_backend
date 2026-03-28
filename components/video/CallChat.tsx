import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface Message {
    id: string;
    text: string;
    senderId: number;
    timestamp: string;
}

interface CallChatProps {
    messages: Message[];
    onSendMessage: (text: string) => void;
    currentUserId?: number;
}

export function CallChat({ messages, onSendMessage, currentUserId = 0 }: CallChatProps) {

    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isMe = item.senderId === currentUserId || item.senderId === 0;
        return (
            <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                <Text style={styles.messageText}>{item.text}</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
            keyboardVerticalOffset={100}
        >
            <View style={styles.chatArea}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            </View>

            
            <BlurView intensity={30} tint="dark" style={styles.inputContainer}>
                <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    style={styles.input}
                    multiline
                />
                <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                    <MaterialCommunityIcons name="send" size={24} color="#6366F1" />
                </TouchableOpacity>
            </BlurView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 20
    },
    chatArea: {
        maxHeight: 200,
        marginBottom: 10
    },
    messageBubble: {
        padding: 10,
        borderRadius: 15,
        marginVertical: 4,
        maxWidth: '80%'
    },
    myBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#4F46E5',
    },
    theirBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#374151',
    },
    messageText: {
        color: '#FFF',
        fontSize: 14
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 5,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden'
    },
    input: {
        flex: 1,
        color: '#FFF',
        paddingVertical: 8,
        maxHeight: 80
    },
    sendButton: {
        padding: 8
    }
});
