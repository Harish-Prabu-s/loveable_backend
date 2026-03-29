import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSecurityStore } from '@/store/securityStore';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

/**
 * ResetAppLockScreen
 * 
 * Professional recovery portal with:
 * - Secure OTP verification via email
 * - Glassmorphism UI components
 * - Direct link to re-setup security
 */
export default function ResetAppLockScreen() {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const { setHighSecurity, setPin, setPattern } = useSecurityStore();
    
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const email = user?.email || '';

    const handleSendOTP = async () => {
        if (!email) {
            Alert.alert('Configuration Error', 'No recovery email associated with this account. Please contact support.');
            return;
        }
        setLoading(true);
        try {
            await authApi.requestResetOTP(email);
            setStep('verify');
            Alert.alert('Security Code Sent', `A private verification code has been dispatched to ${email}. Please check your inbox.`);
        } catch (error: any) {
            Alert.alert('Request Failed', error?.response?.data?.error || 'We could not initiate the recovery process right now.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length < 6) {
            Alert.alert('Incomplete Code', 'The security code must be 6 digits long.');
            return;
        }
        setLoading(true);
        try {
            await authApi.verifyResetOTP(email, otp);
            
            // Clear all local security settings on successful verify
            await setHighSecurity('none');
            await setPin(null);
            await setPattern(null);

            Alert.alert('Identity Verified', 'Your security settings have been reset. What would you like to do next?', [
                { text: 'Set New App PIN', onPress: () => router.push('/settings/set-pin' as any) },
                { text: 'Reset Account Password', onPress: () => router.push('/settings/reset-password' as any) },
                { text: 'Later', style: 'cancel' }
            ]);
        } catch (error: any) {
            Alert.alert('Verification Failed', 'The code entered is invalid or has expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            {/* Background Decorative Blur */}
            <View style={styles.bgDecor} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: isDark ? "#FFF" : "#000" }]}>Security Recovery</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <View style={styles.content}>
                    <MotiView 
                        from={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 12 }}
                        style={styles.iconWrapper}
                    >
                        <BlurView intensity={20} style={styles.iconBlur}>
                            <MaterialCommunityIcons 
                                name={step === 'request' ? "shield-lock-outline" : "email-check-outline"} 
                                size={60} 
                                color="#8B5CF6" 
                            />
                        </BlurView>
                    </MotiView>

                    <AnimatePresence exitBeforeEnter>
                        {step === 'request' ? (
                            <MotiView 
                                key="request"
                                from={{ opacity: 0, translateX: -20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: 20 }}
                                style={styles.stepContainer}
                            >
                                <Text style={[styles.subtitle, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>
                                    Locked out of your account?
                                </Text>
                                <Text style={styles.description}>
                                    Don't worry. We can reset your App Lock using a secure verification code sent to your registered email:
                                </Text>
                                <View style={styles.emailPill}>
                                    <MaterialCommunityIcons name="email-outline" size={16} color="#8B5CF6" />
                                    <Text style={styles.emailText}>{email}</Text>
                                </View>

                                <TouchableOpacity 
                                    style={styles.mainBtn} 
                                    onPress={handleSendOTP}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={styles.mainBtnText}>Authorize Recovery</Text>
                                            <MaterialCommunityIcons name="chevron-right" size={20} color="#FFF" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </MotiView>
                        ) : (
                            <MotiView 
                                key="verify"
                                from={{ opacity: 0, translateX: 20 }}
                                animate={{ opacity: 1, translateX: 0 }}
                                exit={{ opacity: 0, translateX: -20 }}
                                style={styles.stepContainer}
                            >
                                <Text style={[styles.subtitle, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>
                                    Verify Identity
                                </Text>
                                <Text style={styles.description}>
                                    Enter the 6-digit cryptographic code sent to your email to authorize the security reset.
                                </Text>

                                <TextInput
                                    style={[styles.input, { color: isDark ? '#FFF' : '#000', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                    placeholder="000 000"
                                    placeholderTextColor="#475569"
                                    maxLength={6}
                                    keyboardType="number-pad"
                                    value={otp}
                                    onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
                                    autoFocus
                                />

                                <TouchableOpacity 
                                    style={[styles.mainBtn, styles.verifyBtn]} 
                                    onPress={handleVerify}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={styles.mainBtnText}>Authenticate & Reset</Text>
                                            <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setStep('request')} style={styles.resendBtn}>
                                    <Text style={styles.resendText}>Request a new code</Text>
                                </TouchableOpacity>
                            </MotiView>
                        )}
                    </AnimatePresence>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    bgDecor: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    backBtn: { 
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center'
    },
    title: { fontSize: 18, fontWeight: '800' },
    content: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
    
    iconWrapper: {
        width: 120, height: 120, borderRadius: 60,
        marginBottom: 40, overflow: 'hidden',
    },
    iconBlur: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    
    stepContainer: { width: '100%', alignItems: 'center' },
    subtitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
    description: { 
        fontSize: 15, color: '#64748B', textAlign: 'center', 
        lineHeight: 24, marginBottom: 30, paddingHorizontal: 10 
    },
    
    emailPill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 20, marginBottom: 40,
    },
    emailText: { color: '#8B5CF6', fontWeight: '700', fontSize: 15 },
    
    input: {
        width: '100%', height: 75, borderWidth: 2, borderRadius: 24,
        marginBottom: 30, textAlign: 'center',
        fontSize: 36, fontWeight: '800', letterSpacing: 10,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    mainBtn: {
        flexDirection: 'row',
        backgroundColor: '#8B5CF6', width: '100%', height: 60,
        borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        gap: 12, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
    },
    verifyBtn: {
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
    },
    mainBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    resendBtn: { marginTop: 30, padding: 10 },
    resendText: { color: '#8B5CF6', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
