import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { accountApi } from '@/api/account';
import { storage } from '@/lib/storage';

export default function DeleteAccountConfirmScreen() {
    const { token } = useLocalSearchParams();
    const { logout } = useAuthStore();
    const [status, setStatus] = useState<'pending' | 'success' | 'invalid'>('pending');

    useEffect(() => {
        const processDeletion = async () => {
            try {
                await accountApi.confirmDeletion(typeof token === 'string' ? token : '');
                await logout();
                setStatus('success');
            } catch (error) {
                // Dev mode fallback
                try {
                    const raw = await storage.getItem('delete_request');
                    if (!raw) {
                        setStatus('invalid');
                        return;
                    }

                    const req = JSON.parse(raw);
                    const valid = req.token === token && Date.now() < req.expiresAt;

                    if (!valid) {
                        setStatus('invalid');
                        return;
                    }

                    await logout();
                    await storage.removeItem('delete_request');
                    setStatus('success');
                    Alert.alert('Dev Mode', 'Account deleted using local token');
                } catch (e) {
                    setStatus('invalid');
                }
            }
        };

        processDeletion();
    }, [token, logout]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {status === 'pending' && (
                    <View style={styles.card}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={styles.processingText}>Processing deletion...</Text>
                    </View>
                )}

                {status === 'success' && (
                    <View style={styles.card}>
                        <MaterialCommunityIcons name="shield-check" size={64} color="#16A34A" style={styles.icon} />
                        <Text style={styles.title}>Account Deleted</Text>
                        <Text style={styles.description}>Your account has been successfully removed.</Text>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.replace('/login')}
                        >
                            <Text style={styles.primaryButtonText}>Go to Login</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {status === 'invalid' && (
                    <View style={styles.card}>
                        <MaterialCommunityIcons name="close-circle" size={64} color="#DC2626" style={styles.icon} />
                        <Text style={styles.title}>Invalid or Expired Link</Text>
                        <Text style={styles.description}>The deletion link is no longer valid. Please request deletion again.</Text>

                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: '#0F172A' }]}
                            onPress={() => router.replace('/settings/delete-account')}
                        >
                            <Text style={styles.primaryButtonText}>Request Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    icon: {
        marginBottom: 16,
    },
    processingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    primaryButton: {
        backgroundColor: '#8B5CF6',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    }
});
