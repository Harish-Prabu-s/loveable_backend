import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function ResetAppLockScreen() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const email = user?.email || '';

    const handleSendOTP = async () => {
        if (!email) {
            Alert.alert('Error', 'No recovery email associated with this account.');
            return;
        }
        setLoading(true);
        try {
            await authApi.requestResetOTP(email);
            setStep('verify');
            Alert.alert('OTP Sent', `A verification code has been sent to ${email}`);
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length < 6) {
            Alert.alert('Error', 'Please enter the 6-digit code.');
            return;
        }
        setLoading(true);
        try {
            await authApi.verifyResetOTP(email, otp);
            Alert.alert('Success', 'Recovery verified. You can now set a new App Lock.', [
                { text: 'OK', onPress: () => router.push('/settings/set-pin' as any) }
            ]);
        } catch (error: any) {
            Alert.alert('Error', 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: isDark ? "#FFF" : "#000" }]}>Reset App Lock</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="shield-refresh" size={80} color="#8B5CF6" />
                    </View>

                    {step === 'request' ? (
                        <>
                            <Text style={[styles.subtitle, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>
                                Forget your App Lock PIN or Pattern?
                            </Text>
                            <Text style={styles.description}>
                                We will send a secure verification code to your registered email:
                                <Text style={styles.emailHighlight}> {email}</Text>
                            </Text>

                            <TouchableOpacity 
                                style={styles.mainBtn} 
                                onPress={handleSendOTP}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <Text style={styles.mainBtnText}>Send Recovery Code</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.subtitle, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>
                                Enter Verification Code
                            </Text>
                            <Text style={styles.description}>
                                Please enter the 6-digit code sent to your email.
                            </Text>

                            <TextInput
                                style={[styles.input, { color: isDark ? '#FFF' : '#000', borderColor: isDark ? '#1E293B' : '#CBD5E1' }]}
                                placeholder="000000"
                                placeholderTextColor="#64748B"
                                maxLength={6}
                                keyboardType="number-pad"
                                value={otp}
                                onChangeText={setOtp}
                                autoFocus
                            />

                            <TouchableOpacity 
                                style={styles.mainBtn} 
                                onPress={handleVerify}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <Text style={styles.mainBtnText}>Verify & Reset</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setStep('request')} style={styles.resendBtn}>
                                <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700' },
    content: { flex: 1, padding: 30, alignItems: 'center' },
    iconContainer: {
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(139,92,246,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 30,
    },
    subtitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    description: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
    emailHighlight: { color: '#8B5CF6', fontWeight: '700' },
    input: {
        width: '100%', height: 60, borderWidth: 1.5, borderRadius: 16,
        marginTop: 30, marginBottom: 20, textAlign: 'center',
        fontSize: 28, fontWeight: '700', letterSpacing: 8,
    },
    mainBtn: {
        backgroundColor: '#8B5CF6', width: '100%', height: 56,
        borderRadius: 16, alignItems: 'center', justifyContent: 'center',
        marginTop: 20, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    resendBtn: { marginTop: 24 },
    resendText: { color: '#8B5CF6', fontSize: 14, fontWeight: '600' },
});
