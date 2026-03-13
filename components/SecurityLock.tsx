import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '@/store/securityStore';
import { toast } from '@/utils/toast';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export const SecurityLock = () => {
    const { isLocked, pin, setLocked, biometricsEnabled } = useSecurityStore();
    const [enteredPin, setEnteredPin] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isLocked && biometricsEnabled) {
            handleBiometricAuth();
        }
    }, [isLocked]);

    const handleBiometricAuth = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Vibely',
                fallbackLabel: 'Use PIN',
            });
            if (result.success) {
                setLocked(false);
                setEnteredPin('');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handlePress = (num: string) => {
        if (enteredPin.length >= 4) return;
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
                }, 500);
            }
        }
    };

    const handleDelete = () => {
        setEnteredPin(prev => prev.slice(0, -1));
    };

    if (!isLocked) return null;

    return (
        <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

            <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'transparent', 'rgba(139, 92, 246, 0.1)']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.container}>
                <MotiView
                    from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    style={styles.content}
                >
                    <MaterialCommunityIcons name="lock-outline" size={64} color="#8B5CF6" />
                    <Text style={styles.title}>Vibely Locked</Text>
                    <Text style={styles.subtitle}>Enter PIN to unlock your account</Text>

                    <View style={styles.dotsContainer}>
                        {[1, 2, 3, 4].map((_, i) => (
                            <MotiView
                                key={i}
                                animate={{
                                    scale: enteredPin.length > i ? 1.2 : 1,
                                    backgroundColor: enteredPin.length > i ? '#8B5CF6' : '#1E293B',
                                    borderColor: error ? '#EF4444' : '#8B5CF6',
                                }}
                                style={[styles.dot, error && styles.dotError]}
                            />
                        ))}
                    </View>

                    <View style={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <TouchableOpacity
                                key={num}
                                style={styles.key}
                                onPress={() => handlePress(String(num))}
                            >
                                <Text style={styles.keyText}>{num}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.key} onPress={handleBiometricAuth}>
                            {biometricsEnabled && <MaterialCommunityIcons name="fingerprint" size={28} color="#8B5CF6" />}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.key} onPress={() => handlePress('0')}>
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.key} onPress={handleDelete}>
                            <MaterialCommunityIcons name="backspace-outline" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
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
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8FAFC',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 8,
        marginBottom: 40,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 50,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    dotError: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width * 0.8,
        justifyContent: 'center',
        gap: 20,
    },
    key: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    keyText: {
        fontSize: 24,
        color: '#F8FAFC',
        fontWeight: '600',
    },
});
