import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface BiometricScannerProps {
    type: 'fingerprint' | 'face';
    isScanning: boolean;
    status: 'idle' | 'success' | 'failed';
}

export const BiometricScanner = ({ type, isScanning, status }: BiometricScannerProps) => {
    const iconName = type === 'face' ? 'face-recognition' : 'fingerprint';
    const primaryColor = status === 'success' ? '#10B981' : (status === 'failed' ? '#EF4444' : '#8B5CF6');

    return (
        <View style={styles.container}>
            {/* Outer Ring */}
            <MotiView
                animate={{
                    borderColor: primaryColor,
                    scale: isScanning ? [1, 1.05, 1] : 1,
                    rotate: isScanning ? '360deg' : '0deg'
                }}
                transition={{
                    type: 'timing',
                    duration: 3000,
                    loop: isScanning,
                }}
                style={styles.outerRing}
            />

            {/* Inner Content */}
            <View style={styles.innerContent}>
                <MaterialCommunityIcons 
                    name={iconName} 
                    size={80} 
                    color={primaryColor} 
                />

                {/* Scanning Laser Line */}
                {isScanning && (
                    <MotiView
                        from={{ translateY: -40, opacity: 0 }}
                        animate={{ translateY: 40, opacity: 1 }}
                        transition={{
                            type: 'timing',
                            duration: 1500,
                            loop: true,
                        }}
                        style={[styles.laser, { backgroundColor: primaryColor }]}
                    />
                )}

                {/* Connection Dots (Glassmorphism feel) */}
                <AnimatePresence>
                    {isScanning && (
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={styles.particles}
                        >
                            {[...Array(6)].map((_, i) => (
                                <MotiView
                                    key={i}
                                    from={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 0.4 }}
                                    transition={{
                                        delay: i * 200,
                                        loop: true,
                                        duration: 2000
                                    }}
                                    style={[
                                        styles.particle,
                                        { 
                                            left: Math.random() * 100 - 50,
                                            top: Math.random() * 100 - 50,
                                            backgroundColor: primaryColor
                                        }
                                    ]}
                                />
                            ))}
                        </MotiView>
                    )}
                </AnimatePresence>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outerRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    innerContent: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    laser: {
        position: 'absolute',
        width: '120%',
        height: 2,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        zIndex: 10,
    },
    particles: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
    }
});

import { AnimatePresence } from 'moti';
