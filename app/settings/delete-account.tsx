import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountApi } from '@/api/account';
import { storage } from '@/lib/storage'; // Custom storage wrapper for AsyncStorage

const makeToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

export default function DeleteAccountRequestScreen() {
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRequest = async () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please provide a reason');
            return;
        }

        setIsLoading(true);
        try {
            await accountApi.requestDeletion(reason);
            Alert.alert(
                'Request Sent',
                'Deletion request created. Please check your email for confirmation.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            // Dev mode fallback matching web logic
            const token = makeToken();
            const expiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
            await storage.setItem('delete_request', JSON.stringify({ reason, token, expiresAt }));

            Alert.alert(
                'Dev Mode: Simulated',
                `Simulated confirmation link. Token: ${token}`,
                [
                    {
                        text: 'Go to Simulator',
                        onPress: () => router.push(`/settings/delete-confirm/${token}`)
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <MaterialCommunityIcons name="alert" size={24} color="#EF4444" />
                            <Text style={styles.title}>Delete Account</Text>
                        </View>

                        <Text style={styles.description}>
                            Your account will be deleted only after email confirmation within 2 days.
                        </Text>

                        <Text style={styles.label}>Reason</Text>
                        <TextInput
                            style={styles.input}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Tell us why you want to delete your account"
                            placeholderTextColor="#94A3B8"
                            multiline
                            textAlignVertical="top"
                            editable={!isLoading}
                        />

                        <TouchableOpacity
                            style={[styles.deleteButton, isLoading && styles.deleteButtonDisabled]}
                            onPress={handleRequest}
                            disabled={isLoading}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.deleteButtonText}>
                                {isLoading ? 'Processing...' : 'Request Deletion'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.footerInfo}>
                            <MaterialCommunityIcons name="check-circle" size={14} color="#22C55E" />
                            <Text style={styles.footerText}>
                                Confirmation link will be valid for 2 days.
                            </Text>
                        </View>
                    </View>
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
    keyboardView: {
        flex: 1,
    },
    header: {
        padding: 16,
    },
    backButton: {
        padding: 8,
        alignSelf: 'flex-start',
    },
    content: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginLeft: 8,
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        height: 120,
        color: '#0F172A',
        fontSize: 15,
        marginBottom: 24,
    },
    deleteButton: {
        backgroundColor: '#DC2626',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
    },
    deleteButtonDisabled: {
        opacity: 0.7,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    footerText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 6,
    }
});
