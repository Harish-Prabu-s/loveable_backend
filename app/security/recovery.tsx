import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert, 
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { securityApi } from '@/api/security';
import { useAuth } from '@/context/AuthContext';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * SecurityRecoveryScreen
 * 
 * Flow:
 * 1. Confirmation Screen: Ask user to initiate reset (sends OTP to email).
 * 2. OTP Input: User enters 6-digit code.
 * 3. Finalization: Lock is cleared by backend, client navigates back.
 */
export default function SecurityRecoveryScreen() {
    const { user } = useAuth();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Confirm, 2: Verify OTP

    const handleSendOTP = async () => {
        if (!user?.email) {
            Alert.alert('No Email', 'You must have an email associated with your account to recover your PIN.');
            return;
        }

        setLoading(true);
        try {
            const res = await securityApi.initReset();
            if (res.success) {
                setStep(2);
            } else {
                Alert.alert('Error', res.message || 'Failed to send OTP.');
            }
        } catch (e: any) {
            console.error('[Recovery] Send Error:', e);
            Alert.alert('Error', e.response?.data?.message || 'A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length < 6) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit code sent to your email.');
            return;
        }

        setLoading(true);
        try {
            const res = await securityApi.verifyReset(otp);
            if (res.success) {
                Alert.alert('Success', 'Your App Lock has been reset. You can now set a new PIN in settings.', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                Alert.alert('Incorrect Code', 'The OTP provided is incorrect or expired.');
            }
        } catch (e: any) {
            Alert.alert('Error', 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <LinearGradient
                colors={['#0F172A', '#1E1B4B']}
                style={StyleSheet.absoluteFill}
            />

            <MotiView 
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={styles.content}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
                </TouchableOpacity>

                <View style={[styles.iconBox, { backgroundColor: step === 1 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)' }]}>
                    <MaterialCommunityIcons 
                        name={step === 1 ? "email-outline" : "form-textbox"} 
                        size={48} 
                        color={step === 1 ? "#8B5CF6" : "#22C55E"} 
                    />
                </View>

                <Text style={styles.title}>
                    {step === 1 ? 'Reset App Lock' : 'Verify Recovery'}
                </Text>
                
                <Text style={styles.subtitle}>
                    {step === 1 
                        ? `We will send a one-time reset code to your registered email: ${user?.email || 'N/A'}`
                        : "Enter the code sent to your email to clear your current app lock."}
                </Text>

                <AnimatePresence>
                    {step === 1 ? (
                        <MotiView key="step1" exit={{ opacity: 0, scale: 0.9 }}>
                            <TouchableOpacity 
                                style={styles.primaryBtn} 
                                onPress={handleSendOTP}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
                            </TouchableOpacity>
                        </MotiView>
                    ) : (
                        <MotiView 
                            key="step2" 
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ width: '100%' }}
                        >
                            <TextInput
                                placeholder="Enter 6-digit code"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                style={styles.input}
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                                autoFocus
                            />
                            <TouchableOpacity 
                                style={[styles.primaryBtn, { backgroundColor: '#22C55E' }]} 
                                onPress={handleVerifyOTP}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Reset Now</Text>}
                            </TouchableOpacity>
                        </MotiView>
                    )}
                </AnimatePresence>
            </MotiView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        padding: 10,
    },
    iconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    primaryBtn: {
        backgroundColor: '#8B5CF6',
        width: width * 0.8,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        height: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        color: '#FFF',
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 20,
    }
});
