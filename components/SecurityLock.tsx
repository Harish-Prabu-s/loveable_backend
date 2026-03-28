import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '@/store/securityStore';
import { toast } from '@/utils/toast';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import PatternLock from './lock/PatternLock';

const { width, height } = Dimensions.get('window');

export const SecurityLock = () => {
    const { isLocked, pin, pattern, setLocked, biometricsEnabled } = useSecurityStore();
    const [enteredPin, setEnteredPin] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isLocked && biometricsEnabled) {
            // Slight delay to ensure UI is ready and feels smooth
            const timer = setTimeout(() => {
                handleBiometricAuth();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isLocked, biometricsEnabled]);

    const handleBiometricAuth = async () => {
        if (!biometricsEnabled) return;
        
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            
            if (hasHardware && isEnrolled) {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Unlock Vibely',
                    fallbackLabel: 'Use PIN',
                    disableDeviceFallback: false,
                    cancelLabel: 'Cancel',
                });
                
                if (result.success) {
                    setLocked(false);
                    setEnteredPin('');
                }
            }
        } catch (e) {
            console.error('Biometric error:', e);
        }
    };

    const handlePress = (num: string) => {
        if (enteredPin.length >= 4 || error) return;
        
        const newPin = enteredPin + num;
        setEnteredPin(newPin);

        if (newPin.length === 4) {
            if (newPin === pin) {
                setLocked(false);
                setEnteredPin('');
                setError(false);
            } else {
                Vibration.vibrate(100);
                setError(true);
                setTimeout(() => {
                    setEnteredPin('');
                    setError(false);
                }, 800);
            }
        }
    };

    const handleDelete = () => {
        if (enteredPin.length > 0) {
            setEnteredPin(prev => prev.slice(0, -1));
        }
    };

    const handlePatternComplete = (enteredPattern: number[]) => {
        if (enteredPattern.join(',') === pattern) {
            setLocked(false);
            setError(false);
        } else {
            Vibration.vibrate(100);
            setError(true);
            setTimeout(() => {
                setError(false);
            }, 800);
        }
    };

    if (!isLocked) return null;

    return (
        <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} tint="dark" style={StyleSheet.absoluteFill} />

            <LinearGradient
                colors={['rgba(139, 92, 246, 0.3)', 'transparent', 'rgba(139, 92, 246, 0.15)']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.container}>
                <MotiView
                    from={{ opacity: 0, scale: 0.9, translateY: 30 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={styles.content}
                >
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="shield-lock-outline" size={56} color="#8B5CF6" />
                    </View>
                    
                    <Text style={styles.title}>Vibely Security</Text>
                    <Text style={styles.subtitle}>Authentication required to continue</Text>

                    {pattern ? (
                        <View style={{ marginTop: 20 }}>
                            <PatternLock 
                                onComplete={handlePatternComplete} 
                                error={error}
                                title="" 
                            />
                            {biometricsEnabled && (
                                <TouchableOpacity 
                                    style={[styles.key, { borderColor: 'transparent', backgroundColor: 'transparent', alignSelf: 'center', marginTop: 40 }]} 
                                    onPress={handleBiometricAuth}
                                    activeOpacity={0.6}
                                >
                                    <MaterialCommunityIcons name="fingerprint" size={48} color="#8B5CF6" />
                                    <Text style={{color: '#8B5CF6', marginTop: 8}}>Use Biometrics</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <>
                            <View style={styles.dotsContainer}>
                        {[0, 1, 2, 3].map((i) => (
                            <MotiView
                                key={i}
                                animate={{
                                    scale: enteredPin.length > i ? 1.2 : 1,
                                    backgroundColor: error ? '#EF4444' : (enteredPin.length > i ? '#8B5CF6' : 'rgba(255,255,255,0.1)'),
                                    borderColor: error ? '#EF4444' : (enteredPin.length > i ? '#8B5CF6' : 'rgba(139, 92, 246, 0.3)'),
                                    translateX: error ? (i % 2 === 0 ? 5 : -5) : 0
                                }}
                                transition={error ? { type: 'timing', duration: 100 } : { type: 'spring' }}
                                style={styles.dot}
                            />
                        ))}
                    </View>

                    <View style={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <TouchableOpacity
                                key={num}
                                style={styles.key}
                                onPress={() => handlePress(String(num))}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.keyText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity 
                            style={[styles.key, { borderColor: 'transparent', backgroundColor: 'transparent' }]} 
                            onPress={handleBiometricAuth}
                            activeOpacity={0.6}
                        >
                            {biometricsEnabled && <MaterialCommunityIcons name="fingerprint" size={32} color="#8B5CF6" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.key}
                            onPress={() => handlePress('0')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.key, { borderColor: 'transparent', backgroundColor: 'transparent' }]} 
                                onPress={handleDelete}
                                onLongPress={() => setEnteredPin('')}
                                activeOpacity={0.6}
                            >
                                <MaterialCommunityIcons name="backspace-outline" size={28} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        </>
                    )}

                    <TouchableOpacity 
                        style={styles.forgotBtn} 
                        onPress={() => {
                            setLocked(false); // Temporarily unlock to navigate
                            router.push('/security/recovery' as any);
                        }}
                    >
                        <Text style={styles.forgotText}>Forgot PIN?</Text>
                    </TouchableOpacity>
                </MotiView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F8FAFC',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 8,
        marginBottom: 48,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 60,
    },
    dot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width * 0.8,
        justifyContent: 'center',
        gap: 24,
    },
    key: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)',
    },
    keyText: {
        fontSize: 28,
        color: '#F8FAFC',
        fontWeight: '500',
    },
    forgotBtn: {
        marginTop: 40,
        padding: 10,
    },
    forgotText: {
        color: '#8B5CF6',
        fontSize: 15,
        fontWeight: '600',
    }
});
