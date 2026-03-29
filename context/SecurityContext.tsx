import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from './AuthContext';
import { useSecurityStore } from '@/store/securityStore';

interface SecurityContextType {
    isLocked: boolean;
    setIsLocked: (locked: boolean) => void;
    authenticateBiometrics: () => Promise<boolean>;
    isBiometricsAvailable: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const { isLocked, setLocked: setIsLocked } = useSecurityStore();
    const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
    const [supportedTypes, setSupportedTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);

    // Check biometric availability on mount
    useEffect(() => {
        (async () => {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            setSupportedTypes(types);
            setIsBiometricsAvailable(hasHardware && isEnrolled);
        })();
    }, []);

    // App state logic has been moved to RootLayout to handle route-based bypassing


    const authenticateBiometrics = async () => {
        if (!isBiometricsAvailable) return false;
        
        const { highSecurityType } = useSecurityStore.getState();
        
        // Only attempt if user has biometrics enabled
        if (highSecurityType === 'none') {
            return false;
        }

        const method = highSecurityType === 'face' ? 'Face ID' : 'Fingerprint';

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Unlock with ${method}`,
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
