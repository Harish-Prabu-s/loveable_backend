import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '@/store/securityStore';
import { useTheme } from '@/context/ThemeContext';
import { MotiView, AnimatePresence } from 'moti';
import { FaceEnrollment } from '@/components/security/FaceEnrollment';
import { FingerprintEnrollment } from '@/components/security/FingerprintEnrollment';

/**
 * BiometricSetupScreen
 * 
 * Advanced registration portal with:
 * - Dynamic hardware detection (Face ID vs Fingerprint)
 * - Animated scanning process
 * - Single-method enforcement logic
 */
export default function BiometricSetupScreen() {
    const { isDark } = useTheme();
    const { setHighSecurity, enrollBiometrics, highSecurityType } = useSecurityStore();
    
    // UI State
    const [selectedType, setSelectedType] = useState<'fingerprint' | 'face'>('fingerprint');
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [showPortal, setShowPortal] = useState(false);
    
    // Hardware State
    const [supportedTypes, setSupportedTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);
    const [hasHardware, setHasHardware] = useState(false);
    const [isEnrolled, setIsEnrolled] = useState(false);

    useEffect(() => {
        const check = async () => {
            const hasH = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            
            setHasHardware(hasH);
            setIsEnrolled(enrolled);
            setSupportedTypes(types);

            // Default to Face ID if it's the primary/only type
            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                setSelectedType('face');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                setSelectedType('fingerprint');
            }
        };
        check();
    }, []);

    const onEnrollComplete = async (data: any) => {
        setShowPortal(false);
        setStatus('scanning');
        
        try {
            await enrollBiometrics(selectedType, data);
            setStatus('success');
            Alert.alert('Registration Verified', `Your ${selectedType} is now securely registered as your primary App Lock method.`, [
                { text: 'Finish Setup', onPress: () => router.back() }
            ]);
        } catch (error) {
            setStatus('failed');
            Alert.alert('System Error', 'Could not persist biometric profile.');
        }
    };

    const handleRegister = () => {
        if (!hasHardware) {
            Alert.alert('Incompatible Device', 'Your device does not support biometric security.');
            return;
        }
        setShowPortal(true);
    };

    const hasFace = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFinger = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: isDark ? "#FFF" : "#000" }]}>Security Registration</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {/* 1. Selector (Only show if multiple types available) */}
                {status === 'idle' && (hasFace && hasFinger) && (
                    <MotiView 
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        style={styles.selector}
                    >
                        <TouchableOpacity 
                            style={[styles.typeBtn, selectedType === 'face' && styles.typeBtnActive]}
                            onPress={() => setSelectedType('face')}
                        >
                            <MaterialCommunityIcons name="face-recognition" size={24} color={selectedType === 'face' ? '#FFF' : '#8B5CF6'} />
                            <Text style={[styles.typeBtnText, selectedType === 'face' && { color: '#FFF' }]}>Face ID</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.typeBtn, selectedType === 'fingerprint' && styles.typeBtnActive]}
                            onPress={() => setSelectedType('fingerprint')}
                        >
                            <MaterialCommunityIcons name="fingerprint" size={24} color={selectedType === 'fingerprint' ? '#FFF' : '#8B5CF6'} />
                            <Text style={[styles.typeBtnText, selectedType === 'fingerprint' && { color: '#FFF' }]}>Fingerprint</Text>
                        </TouchableOpacity>
                    </MotiView>
                )}

                {/* 2. Professional Scanner UI / Enrollment Portals */}
                <View style={styles.scannerWrapper}>
                    <MotiView
                        animate={{
                            scale: status === 'scanning' ? 1.1 : 1,
                            opacity: status === 'scanning' ? 0.7 : 1,
                        }}
                    >
                        <MaterialCommunityIcons 
                            name={selectedType === 'face' ? "face-recognition" : "fingerprint"} 
                            size={120} 
                            color="#8B5CF6" 
                        />
                    </MotiView>
                </View>

                {/* Enrollment Portals Overlay */}
                <AnimatePresence>
                    {showPortal && (
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={StyleSheet.absoluteFill}
                        >
                            {selectedType === 'face' ? (
                                <FaceEnrollment 
                                    onComplete={onEnrollComplete}
                                    onCancel={() => setShowPortal(false)}
                                />
                            ) : (
                                <FingerprintEnrollment 
                                    onComplete={onEnrollComplete}
                                    onCancel={() => setShowPortal(false)}
                                />
                            )}
                        </MotiView>
                    )}
                </AnimatePresence>

                {/* 3. Text Descriptions */}
                <Text style={[styles.statusTitle, { color: isDark ? "#FFF" : "#000" }]}>
                    {status === 'scanning' ? 'Scanning Protected Data...' : 
                     status === 'success' ? 'Locked & Secured' : 
                     `Setup ${selectedType === 'face' ? 'Face ID' : 'Fingerprint'}`}
                </Text>
                
                <Text style={styles.description}>
                    {status === 'success' 
                      ? `Successfully registered! Vibely will now require your ${selectedType} for every access attempt.` 
                      : `We use military-grade device encryption to ensure your ${selectedType} data never leaves this hardware.`}
                </Text>

                {/* 4. Action Controls */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.primaryBtn, status === 'success' && styles.successBtn]} 
                        onPress={handleRegister}
                        disabled={status === 'scanning' || status === 'success'}
                    >
                        {status === 'scanning' ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.btnText}>
                                {status === 'success' ? 'Active & Secure' : 'Register Securely'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    
                    <Text style={styles.policyHint}>
                        Policy: High-security override active. One biometric method allowed.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    backBtn: { 
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center'
    },
    title: { fontSize: 18, fontWeight: '800' },
    content: { flex: 1, padding: 24, alignItems: 'center' },
    
    selector: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 5,
        marginBottom: 40,
        gap: 10,
    },
    typeBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 15, gap: 8,
    },
    typeBtnActive: {
        backgroundColor: '#8B5CF6',
    },
    typeBtnText: {
        fontWeight: '700',
        color: '#8B5CF6',
    },

    scannerWrapper: {
        marginTop: 20,
        marginBottom: 40,
    },

    statusTitle: {
        fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16
    },
    description: {
        fontSize: 15, color: '#64748B', textAlign: 'center',
        lineHeight: 24, marginBottom: 40, paddingHorizontal: 20
    },

    footer: {
        width: '100%',
        marginTop: 'auto',
        gap: 16,
    },
    primaryBtn: {
        backgroundColor: '#8B5CF6',
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    successBtn: {
        backgroundColor: '#10B981',
    },
    btnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
    },
    policyHint: {
        color: '#475569',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: '600',
    }
});
