import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '@/store/securityStore';
import { useTheme } from '@/context/ThemeContext';
import { notificationsApi } from '@/api/notifications';

export default function BiometricSetupScreen() {
    const { isDark } = useTheme();
    const { toggleBiometrics } = useSecurityStore();
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [compatible, setCompatible] = useState(false);
    const [enrolled, setEnrolled] = useState(false);

    useEffect(() => {
        const check = async () => {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setCompatible(hasHardware);
            setEnrolled(isEnrolled);
        };
        check();
    }, []);

    const handleSetup = async () => {
        if (!compatible) {
            Alert.alert('Error', 'Your device does not support biometric authentication.');
            return;
        }

        if (!enrolled) {
            Alert.alert('Error', 'No biometrics (Face ID/Fingerprint) enrolled on this device. Please set them up in your device settings first.');
            return;
        }

        setStatus('scanning');
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Verify identity to enable App Lock',
                fallbackLabel: 'Use Passcode',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setStatus('success');
                toggleBiometrics(true);
                // Also update server settings
                try {
                    await notificationsApi.updateSettings({ app_lock_type: 'biometric' });
                } catch { /* silent fallback */ }
                
                setTimeout(() => {
                    Alert.alert('Success', 'Biometric App Lock enabled successfully.', [
                        { text: 'OK', onPress: () => router.back() }
                    ]);
                }, 1000);
            } else {
                setStatus('failed');
                Alert.alert('Authentication Failed', 'We could not verify your identity.');
            }
        } catch (error) {
            setStatus('failed');
            Alert.alert('Error', 'Something went wrong during authentication.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: isDark ? "#FFF" : "#000" }]}>Biometric Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {status === 'scanning' ? (
                        <ActivityIndicator size="large" color="#8B5CF6" />
                    ) : (
                        <MaterialCommunityIcons 
                            name={status === 'success' ? "face-recognition" : "fingerprint"} 
                            size={100} 
                            color={status === 'success' ? '#10B981' : '#8B5CF6'} 
                        />
                    )}
                </View>

                <Text style={[styles.subtitle, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>
                    {status === 'success' ? 'Biometrics Registered!' : 'Enable Face ID / Fingerprint'}
                </Text>
                
                <Text style={styles.description}>
                    Add an extra layer of security to Vibely. Use your device's biometric sensors to unlock the app instantly and securely.
                </Text>

                <View style={styles.featureList}>
                    <FeatureItem icon="shield-check" text="Secure local authentication" />
                    <FeatureItem icon="flash" text="Instant app access" />
                    <FeatureItem icon="lock-outline" text="Protects your private chats" />
                </View>

                <TouchableOpacity 
                    style={[styles.mainBtn, status === 'success' && { backgroundColor: '#10B981' }]} 
                    onPress={handleSetup}
                    disabled={status === 'scanning'}
                >
                    <Text style={styles.mainBtnText}>
                        {status === 'success' ? 'Already Enabled' : 'Verify & Enable Now'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Your biometric data stays on your device and is never sent to our servers.
                </Text>
            </View>
        </SafeAreaView>
    );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.featureItem}>
            <MaterialCommunityIcons name={icon as any} size={18} color="#8B5CF6" style={{ width: 24 }} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700' },
    content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
    iconContainer: {
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(139,92,246,0.08)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 40,
        borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
    },
    subtitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
    description: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    featureList: { alignSelf: 'stretch', marginBottom: 40, paddingHorizontal: 20 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    featureText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
    mainBtn: {
        backgroundColor: '#8B5CF6', width: '100%', height: 60,
        borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    mainBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    hint: { marginTop: 20, fontSize: 12, color: '#475569', textAlign: 'center' },
});
