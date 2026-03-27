import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi } from '@/api/auth';
import { MotiView, MotiText } from 'moti';
import { BlurBackground } from '@/components/common/BlurBackground';
import { useTheme } from '@/context/ThemeContext';

// Validates international phone numbers (7-15 digits, optionally starting with +)
const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-().]/g, '');
    return /^\+?[1-9]\d{6,14}$/.test(cleaned);
};

// Ensures number has leading +
const formatPhone = (phone: string): string => {
    const cleaned = phone.trim().replace(/[\s\-().]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

export default function PhoneLoginScreen() {
    const { colors, isDark } = useTheme();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const valid = isValidPhone(phone.replace(/[\s\-().]/g, ''));

    const handleSendOtp = async () => {
        if (!valid) {
            Alert.alert('Invalid Number', 'Please enter a valid mobile number (e.g. +91 9876543210).');
            return;
        }

        const formattedPhone = formatPhone(phone);
        setLoading(true);

        try {
            const resp = await authApi.sendOTP({ phone_number: formattedPhone });

            // In dev mode the API may echo back the OTP – show it for testing
            if (resp.otp) {
                Alert.alert('OTP (Dev)', `Your OTP: ${resp.otp}`);
            }

            router.push({
                pathname: '/(auth)/otp',
                params: { phone: formattedPhone },
            });
        } catch (e: any) {
            const data = e?.response?.data;
            const msg = data?.error || data?.detail || data?.message;

            if (!msg && e?.message === 'Network Error') {
                Alert.alert(
                    'Connection Failed',
                    'Could not reach the server. Please check your internet connection and try again.',
                );
            } else {
                Alert.alert('Error', msg || e?.message || 'Failed to send OTP. Please try again.');
            }
        } finally {
            setLoading(false);
        }
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
                        {/* Animated Logo Section */}
                        <MotiView
                            from={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring' }}
                            style={styles.logoSection}
                        >
                             <LinearGradient
                                colors={[colors.accent, colors.primary]}
                                style={styles.logoGradient}
                            >
                                <MaterialCommunityIcons name="cellphone-message" size={50} color="#FFFFFF" />
                            </LinearGradient>
                        </MotiView>

                        {/* Title & Subtitle */}
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: 300, type: 'spring' }}
                            style={styles.textCenter}
                        >
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Welcome Back</Text>
                            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                                Enter your phone number to continue
                            </Text>
                        </MotiView>

                        {/* Form Card - Simplified */}
                        <MotiView
                            from={{ opacity: 0, translateY: 40 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 800, delay: 500 }}
                            style={[styles.formContainer]}
                        >
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                            
                            <View style={[styles.inputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                                <View style={styles.prefixBox}>
                                    <MaterialCommunityIcons name="phone" size={20} color={colors.textSecondary} />
                                </View>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Enter mobile number"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="phone-pad"
                                    autoComplete="tel"
                                    value={phone}
                                    onChangeText={setPhone}
                                    editable={!loading}
                                    maxLength={16}
                                />
                            </View>

                            <Button 
                                label="Send Code" 
                                variant="primary" 
                                loading={loading}
                                disabled={!valid}
                                onPress={handleSendOtp}
                                style={{ marginTop: 8 }}
                            />

                            <View style={styles.dividerRow}>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>Or continue with</Text>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            </View>

                            <Button 
                                label="Use Email Address" 
                                variant="secondary" 
                                disabled={loading}
                            />
                        </MotiView>

                        <MotiText 
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1200 }}
                            style={[styles.footer, { color: colors.textMuted }]}
                        >
                            By continuing, you agree to our Terms of Service and Privacy Policy
                        </MotiText>
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
    logoSection: {
        alignSelf: 'center',
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoGradient: {
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
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    formContainer: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    prefixBox: {
        paddingLeft: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 18,
        fontSize: 18,
        color: '#F8FAFC',
        fontWeight: '600',
    },
    hint: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    button: {
        backgroundColor: '#8B5CF6',
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 10,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    buttonDisabled: {
        opacity: 0.3,
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footer: {
        fontSize: 11,
        color: 'rgba(148, 163, 184, 0.6)',
        textAlign: 'center',
        marginTop: 40,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        gap: 10,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 12,
    }
});
