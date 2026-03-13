import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi } from '@/api/auth';
import { MotiView } from 'moti';

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
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.9, translateY: -20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                    >
                        <LinearGradient
                            colors={['#EC4899', '#8B5CF6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.headerGradient}
                        >
                            <MaterialCommunityIcons name="cellphone" size={52} color="#FFFFFF" />
                            <Text style={styles.headerTitle}>Welcome!</Text>
                            <Text style={styles.headerSubtitle}>
                                Enter your mobile number to get started
                            </Text>
                        </LinearGradient>
                    </MotiView>

                    {/* Form */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 600, delay: 200 }}
                        style={styles.form}
                    >
                        <Text style={styles.label}>Mobile Number</Text>

                        <View style={styles.inputRow}>
                            <View style={styles.prefixBox}>
                                <MaterialCommunityIcons name="phone" size={20} color="#8B5CF6" />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="+91 98765 43210"
                                placeholderTextColor="#4B5563"
                                keyboardType="phone-pad"
                                autoComplete="tel"
                                value={phone}
                                onChangeText={setPhone}
                                editable={!loading}
                                maxLength={16}
                            />
                        </View>

                        <Text style={styles.hint}>
                            We'll send a 6-digit OTP to verify your number.
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, (!valid || loading) && styles.buttonDisabled]}
                            onPress={handleSendOtp}
                            disabled={!valid || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Send OTP</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.footer}>
                            By continuing, you agree to our{' '}
                            <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.footerLink}>Privacy Policy</Text>.
                        </Text>
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
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 16,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#1E293B',
        overflow: 'hidden',
    },
    prefixBox: {
        paddingHorizontal: 14,
        paddingVertical: 16,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 16,
        fontSize: 17,
        color: '#F8FAFC',
        letterSpacing: 0.5,
    },
    hint: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 18,
    },
    button: {
        backgroundColor: '#8B5CF6',
        borderRadius: 14,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
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
        letterSpacing: 0.3,
    },
    footer: {
        fontSize: 11,
        color: '#475569',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 17,
    },
    footerLink: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
});
