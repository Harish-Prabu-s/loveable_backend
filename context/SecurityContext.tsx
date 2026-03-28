import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from './AuthContext';

interface SecurityContextType {
    isLocked: boolean;
    setIsLocked: (locked: boolean) => void;
    authenticateBiometrics: () => Promise<boolean>;
    isBiometricsAvailable: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

    // Check biometric availability on mount
    useEffect(() => {
        (async () => {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricsAvailable(hasHardware && isEnrolled);
        })();
    }, []);

    // Handle App Lock Logic
    useEffect(() => {
        // If user is not logged in or app lock is not enabled, ensure it's unlocked
        if (!isAuthenticated || !user?.app_lock_enabled) {
            setIsLocked(false);
            return;
        }

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            // Logic: Lock the app whenever it comes from background to foreground
            if (nextAppState === 'active') {
                console.log('[SecurityContext] App foregrounded, triggering lock');
                setIsLocked(true);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        // Initial lock on app start if enabled
        setIsLocked(true);

        return () => {
            subscription.remove();
        };
    }, [isAuthenticated, user?.app_lock_enabled, user?.id]);

    const authenticateBiometrics = async () => {
        if (!isBiometricsAvailable) return false;
        
        // Only attempt if user has biometrics enabled in their settings
        if (!user?.biometrics_enabled && !user?.face_unlock_enabled) {
            return false;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Loveable',
                fallbackLabel: 'Use PIN',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setIsLocked(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[SecurityContext] Biometric Auth Error:', error);
            return false;
        }
    };

    return (
        <SecurityContext.Provider value={{ isLocked, setIsLocked, authenticateBiometrics, isBiometricsAvailable }}>
            {children}
        </SecurityContext.Provider>
    );
}

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (!context) throw new Error('useSecurity must be used within SecurityProvider');
    return context;
};

export default SecurityContext;
