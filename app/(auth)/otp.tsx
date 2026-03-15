import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi } from '@/api/auth';
import { storage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import { MotiView } from 'moti';

export default function OtpVerificationScreen() {
    const { phone } = useLocalSearchParams<{ phone: string }>();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const { dispatch, login } = useAuth();

    const isComplete = otp.length === 6;

    const handleVerify = async () => {
        if (!isComplete) {
            Alert.alert('Incomplete OTP', 'Please enter all 6 digits of the OTP.');
            return;
        }
        if (!phone) {
            Alert.alert('Error', 'Phone number is missing. Please go back and try again.');
            return;
        }

        try {
            console.log(`[OTP] Verifying OTP ${otp} for phone ${phone}...`);
            const resp = await authApi.verifyOTP({
                phone_number: phone,
                otp_code: otp,
            });

            console.log('[OTP] Verification Response:', JSON.stringify(resp));

            if (resp.success === false) {
                console.warn('[OTP] Verification failed:', resp.message);
                Alert.alert('Verification Failed', resp.message || 'Verification unsuccessful. Please try again.');
                return;
            }

            const isNewUser =
                resp.is_new_user === true ||
                String(resp.is_new_user).toLowerCase() === 'true' ||
                resp.is_new === true;

            if (isNewUser) {
                // For new users, save the temp token
                // Check all possible field names for flexibility
                const tempToken = resp.temp_token || resp.access || resp.access_token || resp.token || '';

                if (!tempToken) {
                    console.error('[OTP] Missing temp_token in response:', resp);
                    throw new Error('Server did not return a temporary token for onboarding.');
                }

                console.log('[OTP] New user. Token found. Saving temp_token and user...');

                // Robustly get user for new users too
                const user: User = resp.user || {
                    id: resp.id || 0,
                    phone_number: resp.phone_number || phone || '',
                    display_name: resp.display_name || '',
                    email: resp.email || '',
                    gender: null,
                    is_verified: true,
                    is_online: true,
                    date_joined: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                };

                await Promise.all([
                    storage.setItem('temp_token', tempToken),
                    storage.setItem('user', JSON.stringify(user))
                ]);

                dispatch({ type: 'SET_TEMP_TOKEN', payload: { token: tempToken, user } });
                useAuthStore.setState({ tempToken, user });

                console.log('[OTP] Redirecting to onboarding/name');
                router.replace("/onboarding/name");
            } else {
                // Existing user
                const token = resp.access || resp.access_token || resp.token || '';
                const refreshToken = resp.refresh || resp.refresh_token || '';

                if (!token) {
                    console.error('[OTP] Missing access_token in response:', resp);
                    throw new Error('Invalid server response: missing access token');
                }

                // Construct user object robustly
                const user: User = resp.user || {
                    id: resp.id || 0,
                    phone_number: resp.phone_number || phone || '',
                    display_name: resp.display_name || '',
                    email: resp.email || '',
                    gender: null,
                    is_verified: true,
                    is_online: true,
                    date_joined: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                };

                console.log('[OTP] Existing user. Verification Success. Synchronizing state...');

                // Login handles saving both tokens and user data to storage and updating context
                await login(token, user, refreshToken);

                console.log('[OTP] Auth state synchronized. Performing navigation reset to Home...');
                router.replace("/(tabs)");
            }
        } catch (e: any) {
            console.error('[OTP] Critical failure during verification:', e);
            const data = e?.response?.data;
            const msg = data?.error || data?.detail || data?.message;

            if (!msg && e?.message === 'Network Error') {
                Alert.alert('Connection Failed', `Could not reach backend at ${authApi.getBaseUrl()}. Please ensure your laptop and phone are on the same Wi-Fi.`);
            } else {
                Alert.alert('Verification Error', msg || e?.message || 'Verification failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!phone) return;
        try {
            const resp = await authApi.sendOTP({ phone_number: phone });
            if (resp.otp) {
                Alert.alert('OTP Resent (Dev)', `Your new OTP: ${resp.otp}`);
            } else {
                Alert.alert('OTP Resent', resp.message || 'A new OTP has been sent.');
            }
        } catch {
            Alert.alert('Error', 'Could not resend OTP. Please try again.');
        }
    };

    // Render 6 individual digit boxes
    const renderOtpBoxes = () => {
        return Array.from({ length: 6 }).map((_, i) => {
            const digit = otp[i] || '';
            const isFocused = otp.length === i;
            return (
                <MotiView
                    key={i}
                    from={{ opacity: 0, scale: 0.5, translateY: 10 }}
                    animate={{ opacity: 1, scale: digit ? 1.05 : 1, translateY: 0 }}
                    transition={{
                        type: 'spring',
                        delay: 300 + i * 100,
                    }}
                >
                    <TouchableOpacity
                        style={[
                            styles.otpBox,
                            digit ? styles.otpBoxFilled : null,
                            isFocused ? styles.otpBoxFocused : null,
                        ]}
                        onPress={() => inputRef.current?.focus()}
                        activeOpacity={1}
                    >
                        <Text style={styles.otpDigit}>{digit}</Text>
                    </TouchableOpacity>
                </MotiView>
            );
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back button */}
                    <MotiView from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: 200 }}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </MotiView>

                    {/* Header */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.9, translateY: -20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <LinearGradient
                            colors={['#8B5CF6', '#EC4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.headerGradient}
                        >
                            <MaterialCommunityIcons name="shield-check-outline" size={52} color="#FFFFFF" />
                            <Text style={styles.headerTitle}>Verify OTP</Text>
                            <Text style={styles.headerSubtitle}>
                                Sent to{' '}
                                <Text style={styles.phoneHighlight}>{phone}</Text>
                            </Text>
                        </LinearGradient>
                    </MotiView>

                    {/* OTP Boxes */}
                    <View style={styles.otpRow}>
                        {renderOtpBoxes()}
                        {/* Hidden input captures real keyboard input */}
                        <TextInput
                            ref={inputRef}
                            style={styles.hiddenInput}
                            keyboardType="number-pad"
                            maxLength={6}
                            value={otp}
                            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                            autoFocus
                            caretHidden
                        />
                    </View>

                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1000 }}>
                        <TouchableOpacity onPress={handleResend} style={styles.resendBtn}>
                            <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendLink}>Resend OTP</Text></Text>
                        </TouchableOpacity>
                    </MotiView>

                    {/* Verify Button */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 1100 }}
                    >
                        <TouchableOpacity
                            style={[styles.button, (!isComplete || loading) && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={!isComplete || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Verify OTP</Text>
                                    <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#020617',
    },
    kav: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    backBtn: {
        alignSelf: 'flex-start',
        marginBottom: 16,
        padding: 8,
        borderRadius: 10,
        backgroundColor: '#0F172A',
    },
    headerGradient: {
        borderRadius: 28,
        padding: 36,
        alignItems: 'center',
        marginBottom: 36,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 16,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        textAlign: 'center',
    },
    phoneHighlight: {
        fontWeight: '700',
        color: '#FFFFFF',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        position: 'relative',
    },
    otpBox: {
        width: 46,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#0F172A',
        borderWidth: 1.5,
        borderColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpBoxFilled: {
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139,92,246,0.1)',
    },
    otpBoxFocused: {
        borderColor: '#EC4899',
        borderWidth: 2,
    },
    otpDigit: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
    },
    resendBtn: {
        alignSelf: 'center',
        marginBottom: 28,
        paddingVertical: 8,
    },
    resendText: {
        fontSize: 13,
        color: '#475569',
    },
    resendLink: {
        color: '#8B5CF6',
        fontWeight: '700',
    },
    button: {
        backgroundColor: '#8B5CF6',
        borderRadius: 14,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.45,
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
