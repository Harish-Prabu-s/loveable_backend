import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert, 
    Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSecurityStore } from '@/store/securityStore';
import { notificationsApi } from '@/api/notifications';

const { width } = Dimensions.get('window');

export default function BiometricSetupScreen() {
    const { toggleBiometrics, setPin } = useSecurityStore();
    const [loading, setLoading] = useState(false);
    const [available, setAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('Biometric');

    useEffect(() => {
        checkSupport();
    }, []);

    const checkSupport = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        setAvailable(hasHardware && isEnrolled);
        
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID / Recognition');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Fingerprint');
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Verify your ${biometricType} to enable App Lock`,
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                // Success: Update backend and store
                try {
                    await notificationsApi.updateSettings({ app_lock_type: 'biometric' });
                    toggleBiometrics(true);
                    setPin(null); // Clear PIN if switching to biometric
                    
                    Alert.alert(
                        'Registration Successful',
                        `${biometricType} has been linked to your account. Your app is now secure.`,
                        [{ text: 'Continue', onPress: () => router.back() }]
                    );
                } catch (apiErr) {
                    Alert.alert('Error', 'Failed to update remote settings, but biometric lock is enabled locally.');
                    toggleBiometrics(true);
                    router.back();
                }
            } else {
                Alert.alert('Verification Failed', 'Could not verify your identity. Please try again.');
            }
        } catch (e) {
            Alert.alert('Error', 'An error occurred during biometric authentication.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <LinearGradient
                colors={['#0F172A', '#1E1B4B']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Biometric Setup</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.content}>
                <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    style={styles.iconContainer}
                >
                    <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        style={styles.iconGradient}
                    >
                        <MaterialCommunityIcons 
                            name={biometricType.includes('Face') ? "face-recognition" : "fingerprint"} 
                            size={64} 
                            color="#FFF" 
                        />
                    </LinearGradient>
                </MotiView>

                <Text style={styles.title}>Secure Your Account</Text>
                <Text style={styles.description}>
                    Register your {biometricType} to unlock Vibely instantly without needing to enter a PIN every time.
                </Text>

                <View style={styles.featureList}>
                    <FeatureItem icon="shield-check" text="Bank-grade encryption" />
                    <FeatureItem icon="clock-fast" text="Instant 1-tap unlock" />
                    <FeatureItem icon="eye-off" text="No data stored on our servers" />
                </View>

                {!available && (
                    <View style={styles.errorBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" />
                        <Text style={styles.errorText}>
                           No biometric data found. Please register a fingerprint or face in your phone settings first.
                        </Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.primaryBtn, !available && styles.disabledBtn]} 
                    onPress={handleRegister}
                    disabled={loading || !available}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.btnText}>Verify & Register</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.secondaryBtn} 
                    onPress={() => router.back()}
                >
                    <Text style={styles.secondaryBtnText}>Set up later</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.featureItem}>
            <MaterialCommunityIcons name={icon as any} size={20} color="#8B5CF6" />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: {
        flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 40,
        shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 15,
    },
    iconGradient: {
        width: 120, height: 120, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
    },
    title: {
        fontSize: 28, fontWeight: '800', color: '#FFF',
        textAlign: 'center', marginBottom: 12,
    },
    description: {
        fontSize: 15, color: 'rgba(255,255,255,0.6)',
        textAlign: 'center', lineHeight: 22, paddingHorizontal: 20,
        marginBottom: 40,
    },
    featureList: {
        width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20, padding: 20, marginBottom: 40, gap: 16,
    },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureText: { color: '#E2E8F0', fontSize: 15, fontWeight: '500' },
    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 16, borderRadius: 12, marginBottom: 30,
    },
    errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '600' },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#8B5CF6', width: '100%', height: 60,
        borderRadius: 18, gap: 10,
        shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    disabledBtn: { backgroundColor: '#334155', opacity: 0.6 },
    btnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    secondaryBtn: { marginTop: 24, padding: 12 },
    secondaryBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
});
