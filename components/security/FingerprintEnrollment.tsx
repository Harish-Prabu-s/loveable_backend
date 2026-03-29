import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface FingerprintEnrollmentProps {
    onComplete: (data: any) => void;
    onCancel: () => void;
}

export const FingerprintEnrollment = ({ onComplete, onCancel }: FingerprintEnrollmentProps) => {
    const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success'>('idle');
    const [progress, setProgress] = useState(0);

    const handlePressIn = () => {
        if (status !== 'idle') return;
        setStatus('scanning');
        
        // Simulation of a professional scan
        let counter = 0;
        const interval = setInterval(() => {
            counter += 2;
            setProgress(counter);
            if (counter >= 100) {
                clearInterval(interval);
                triggerHardwareAuth();
            }
        }, 30);
    };

    const triggerHardwareAuth = async () => {
        setStatus('verifying');
        
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm hardware registration',
                fallbackLabel: 'Use PIN',
            });

            if (result.success) {
                setStatus('success');
                setTimeout(() => {
                    onComplete({
                        enrolledAt: Date.now(),
                        type: 'fingerprint_v1_secure',
                        hardwareVerified: true
                    });
                }, 1000);
            } else {
                setStatus('idle');
                setProgress(0);
            }
        } catch (error) {
            setStatus('idle');
            setProgress(0);
        }
    };

    return (
        <BlurView intensity={30} style={styles.container} tint="dark">
            <View style={styles.header}>
                <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Biometric Registration</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.instruction}>
                    {status === 'success' ? 'Hardware Locked' :
                     status === 'verifying' ? 'Verifying with System...' :
                     status === 'scanning' ? 'Hold steady...' :
                     'Touch and hold the sensor to begin frequency scan'}
                </Text>

                <View style={styles.sensorContainer}>
                    <AnimatePresence>
                        {status === 'scanning' && (
                            <MotiView
                                from={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 0.2 }}
                                transition={{ type: 'timing', duration: 1000, loop: true }}
                                style={styles.pulse}
                            />
                        )}
                    </AnimatePresence>

                    <TouchableOpacity
                        activeOpacity={1}
                        onPressIn={handlePressIn}
                        style={styles.sensor}
                    >
                        <LinearGradient
                            colors={status === 'success' ? ['#10B981', '#059669'] : ['#8B5CF6', '#6D28D9']}
                            style={styles.sensorGradient}
                        >
                            <MaterialCommunityIcons 
                                name={status === 'success' ? "check-decagram" : "fingerprint"} 
                                size={60} 
                                color="#FFF" 
                            />
                        </LinearGradient>

                        {status === 'scanning' && (
                            <MotiView
                                animate={{ height: `${progress}%` }}
                                style={styles.scanOverlay}
                            />
                        )}
                    </TouchableOpacity>
                </View>

                {status === 'scanning' && (
                    <Text style={styles.progressText}>{progress}% Complete</Text>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="shield-check" size={20} color="#8B5CF6" />
                    <Text style={styles.infoText}>Encrypted hardware-level verification</Text>
                </View>
            </View>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    title: { color: '#FFF', fontSize: 18, fontWeight: '800' },

    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    instruction: { color: '#FFF', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 60, height: 80 },

    sensorContainer: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
    sensor: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', backgroundColor: '#1F2937', elevation: 10 },
    sensorGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    
    pulse: {
        position: 'absolute',
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#8B5CF6',
    },

    scanOverlay: {
        position: 'absolute',
        bottom: 0, width: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
    },

    progressText: { color: '#8B5CF6', fontSize: 18, fontWeight: '800', marginTop: 30 },

    footer: { padding: 40, alignItems: 'center' },
    infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 15, borderRadius: 15 },
    infoText: { color: '#A78BFA', marginLeft: 10, fontSize: 13, fontWeight: '600' }
});
