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
import { Button } from '@/components/ui/button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi } from '@/api/auth';
import { storage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { MotiView, MotiText } from 'moti';
import { BlurBackground } from '@/components/common/BlurBackground';
import { PremiumLoader } from '@/components/common/PremiumLoader';
import { useTheme } from '@/context/ThemeContext';
import { User } from '@/types';

export default function OtpVerificationScreen() {
    const { colors, isDark } = useTheme();
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
                            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                            digit ? { borderColor: colors.primary, backgroundColor: colors.primary + '26' } : null,
                            isFocused ? { borderColor: colors.accent, borderWidth: 2 } : null,
                        ]}
                        onPress={() => inputRef.current?.focus()}
                        activeOpacity={1}
                    >
                        <Text style={[styles.otpDigit, { color: colors.text }]}>{digit}</Text>
                    </TouchableOpacity>
                </MotiView>
            );
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                        <MotiView 
                            from={{ opacity: 0, translateX: -20 }} 
                            animate={{ opacity: 1, translateX: 0 }} 
                            transition={{ delay: 200, type: 'spring' }}
                        >
                            <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.back()}>
                                <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
                            </TouchableOpacity>
                        </MotiView>

                        {/* Animated Verification Icon */}
                        <MotiView
                            from={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', delay: 300 }}
                            style={styles.iconContainer}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.accent]}
                                style={styles.iconGradient}
                            >
                                <MaterialCommunityIcons name="shield-lock-outline" size={50} color="#FFFFFF" />
                            </LinearGradient>
                        </MotiView>

                        {/* Header Info */}
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 500 }}
                            style={styles.textCenter}
                        >
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Check your phone</Text>
                            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                                We've sent a 6-digit code to{'\n'}
                                <Text style={[styles.phoneHighlight, { color: colors.accent }]}>{phone}</Text>
                            </Text>
                        </MotiView>

                        {/* OTP Input Section */}
                        <View style={styles.otpRow}>
                            {renderOtpBoxes()}
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

                        <MotiView 
                            from={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ delay: 1000 }}
                            style={styles.resendContainer}
                        >
                            <TouchableOpacity onPress={handleResend} style={styles.resendBtn}>
                                <Text style={[styles.resendText, { color: colors.textSecondary }]}>Didn't receive code? <Text style={[styles.resendLink, { color: colors.accent }]}>Resend Now</Text></Text>
                            </TouchableOpacity>
                        </MotiView>

                        {/* Action Button */}
                        <MotiView
                            from={{ opacity: 0, translateY: 30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 800, type: 'spring' }}
                        >
                            <Button 
                                label="Verify Code" 
                                variant="primary" 
                                loading={loading}
                                disabled={!isComplete}
                                onPress={handleVerify}
                            />
                        </MotiView>

                        <Text style={[styles.securityText, { color: '#10B981' }]}>
                            <MaterialCommunityIcons name="lock-check" size={14} color="#10B981" /> End-to-end encrypted verification
                        </Text>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
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
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        alignSelf: 'center',
        marginBottom: 24,
    },
    iconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCenter: {
        alignItems: 'center',
        marginBottom: 40,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 24,
    },
    phoneHighlight: {
        color: '#8B5CF6',
        fontWeight: '800',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    otpBox: {
        width: 48,
        height: 64,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    otpBoxFilled: {
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
    },
    otpBoxFocused: {
        borderColor: '#EC4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        transform: [{ scale: 1.05 }],
    },
    otpDigit: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
    },
    resendContainer: {
        marginBottom: 32,
    },
    resendBtn: {
        alignSelf: 'center',
        padding: 10,
    },
    resendText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    resendLink: {
        fontWeight: '800',
        textDecorationLine: 'underline',
    },
    button: {
        backgroundColor: '#8B5CF6',
        borderRadius: 18,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    buttonDisabled: {
        opacity: 0.3,
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    securityText: {
        textAlign: 'center',
        marginTop: 24,
        color: '#10B981',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        opacity: 0.8,
    }
});
