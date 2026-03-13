import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}

export interface ToastRef {
    show: (options: ToastOptions) => void;
}

const Toast = forwardRef<ToastRef>((_, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('info');

    const hide = useCallback(() => {
        setIsVisible(false);
    }, []);

    useImperativeHandle(ref, () => ({
        show: ({ message, type = 'info', duration = 3000 }) => {
            setMessage(message);
            setType(type);
            setIsVisible(true);
            setTimeout(hide, duration);
        },
    }));

    const getColors = () => {
        switch (type) {
            case 'success':
                return ['#10B981', '#059669'];
            case 'error':
                return ['#EF4444', '#DC2626'];
            case 'info':
            default:
                return ['#8B5CF6', '#7C3AED'];
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'check-circle';
            case 'error':
                return 'alert-circle';
            case 'info':
            default:
                return 'information';
        }
    };

    return (
        <View style={styles.outerContainer} pointerEvents="none">
            <AnimatePresence>
                {isVisible && (
                    <MotiView
                        from={{ opacity: 0, translateY: -100, scale: 0.9 }}
                        animate={{ opacity: 1, translateY: 0, scale: 1 }}
                        exit={{ opacity: 0, translateY: -100, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 15 }}
                        style={styles.container}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                            <LinearGradient
                                colors={getColors() as [string, string, ...string[]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradient}
                            >
                                <View style={styles.content}>
                                    <MaterialCommunityIcons name={getIcon()} size={24} color="#FFFFFF" />
                                    <Text style={styles.message}>{message}</Text>
                                </View>
                            </LinearGradient>
                        </BlurView>
                    </MotiView>
                )}
            </AnimatePresence>
        </View>
    );
});

export default Toast;

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    container: {
        width: width * 0.9,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    blurContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradient: {
        padding: 16,
        borderRadius: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    message: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
});
