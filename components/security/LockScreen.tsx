import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions, Platform, Vibration } from 'react-native';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSecurity } from '@/context/SecurityContext';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

/**
 * LockScreen Component
 * 
 * High-end security portal with:
 * - Floating glassmorphism UI
 * - Pulsing logo animation
 * - Biometric auto-triggering
 * - Numeric sequence validation
 * - Dynamic feedback for errors
 */
export const LockScreen = () => {
    const { isLocked, setIsLocked, authenticateBiometrics, isBiometricsAvailable } = useSecurity();
    const { user } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(0);

    // Filter PIN to only allowed length
    const PIN_LENGTH = 4;

    // Attempt Biometric Auth on mount if allowed
    useEffect(() => {
        if (isLocked && (user?.biometrics_enabled || user?.face_unlock_enabled)) {
            const timer = setTimeout(() => {
                authenticateBiometrics();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLocked, user?.biometrics_enabled, user?.face_unlock_enabled]);

    const handlePress = useCallback((num: string) => {
        if (pin.length < PIN_LENGTH) {
            const newPin = pin + num;
            setPin(newPin);
            
            if (newPin.length === PIN_LENGTH) {
                // Verify against stored lock value (defaults to '1111' if not set for testing)
                const storedPin = user?.app_lock_value || '1111';
                
                if (newPin === storedPin) {
                    setIsLocked(false);
                    setPin('');
                } else {
                    // Fail state: Shake and vibrate
                    setError(true);
                    setShake(prev => prev + 1);
                    Vibration.vibrate(500);
                    setTimeout(() => {
                        setPin('');
                        setError(false);
                    }, 400);
                }
            }
        }
    }, [pin, user?.app_lock_value, setIsLocked]);

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    if (!isLocked) return null;

    return (
        <Modal visible={isLocked} animationType="fade" transparent statusBarTranslucent>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.container}>
                <MotiView 
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 300 }}
                    style={[styles.content, { 
                        transform: [{ translateX: shake % 2 === 0 ? 0 : 5 }] // Simple shake fallback if needed
                    }]}
                >
                    {/* Pulsing Aura */}
                    <MotiView
                        from={{ scale: 1, opacity: 0.3 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ loop: true, duration: 2500, type: 'timing' }}
                        style={styles.aura}
                    />

                    {/* Logo Section */}
                    <View style={styles.headerSection}>
                        <MotiView
                            from={{ rotate: '0deg' }}
                            animate={{ rotate: '360deg' }}
                            transition={{ loop: true, duration: 30000, type: 'timing' }}
                            style={styles.logoRing}
                        />
                        <Image 
                            source={require('@/assets/images/icon.png')} 
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <MotiText 
                        key={error ? 'err' : 'ok'}
                        from={{ opacity: 0, translateY: -10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        style={[styles.title, { color: error ? '#FF4444' : '#FFFFFF' }]}
                    >
                        {error ? 'Invalid PIN' : 'Enter Secret PIN'}
                    </MotiText>

                    {/* PIN Indicator (Dots) */}
                    <View style={styles.dotsContainer}>
                        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                            <MotiView 
                                key={i} 
                                animate={{ 
                                    scale: pin.length > i ? 1.2 : 1,
                                    backgroundColor: pin.length > i 
                                        ? (error ? '#FF4444' : '#8B5CF6') 
                                        : 'rgba(255,255,255,0.2)'
                                }}
                                style={styles.dot} 
                            />
                        ))}
                    </View>

                    {/* Custom Keypad */}
                    <View style={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <TouchableOpacity 
                                key={num} 
                                onPress={() => handlePress(num.toString())} 
                                style={styles.key}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.keyText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                        
                        {/* Biometrics Toggle */}
                        <TouchableOpacity 
                            onPress={authenticateBiometrics} 
                            style={[styles.key, !isBiometricsAvailable && { opacity: 0 }]}
                            disabled={!isBiometricsAvailable}
                        >
                            <MaterialCommunityIcons 
                                name={user?.face_unlock_enabled ? "face-recognition" : "fingerprint"} 
                                size={32} 
                                color="rgba(255,255,255,0.8)" 
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handlePress('0')} style={styles.key}>
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleBackspace} style={styles.key}>
                            <MaterialCommunityIcons name="backspace-outline" size={28} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.forgotBtn}
                        onPress={() => {
                            // Link to recovery screen
                            router.push('/security/recovery' as any);
                        }}
                    >
                        <Text style={styles.forgotText}>Forgot PIN?</Text>
                    </TouchableOpacity>
                </MotiView>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        width: width * 0.9,
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderRadius: 40,
        paddingVertical: 40,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    aura: {
        position: 'absolute',
        top: 60,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#8B5CF6',
        zIndex: -1,
    },
    headerSection: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderStyle: 'dashed',
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 30,
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 50,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width * 0.75,
        justifyContent: 'space-between',
        gap: 15,
        marginBottom: 30,
    },
    key: {
        width: (width * 0.75 - 40) / 3,
        height: (width * 0.75 - 40) / 3,
        borderRadius: (width * 0.75 - 40) / 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    keyText: {
        fontSize: 28,
        color: '#FFFFFF',
        fontWeight: '300',
    },
    forgotBtn: {
        marginTop: 10,
        padding: 10,
    },
    forgotText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        fontWeight: '600',
    },
});
