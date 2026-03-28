import { create } from 'zustand';
import { storage } from '@/lib/storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface SecurityState {
    isLocked: boolean;
    pin: string | null;
    pattern: string | null;
    biometricsEnabled: boolean;
    lastBackgroundTime: number | null;
    lockGracePeriod: number; // in milliseconds, default 30s

    initialize: () => Promise<void>;
    setLocked: (locked: boolean) => void;
    setPin: (pin: string | null) => Promise<void>;
    setPattern: (pattern: string | null) => Promise<void>;
    toggleBiometrics: (enabled: boolean) => Promise<void>;
    recordBackgroundTime: () => void;
    checkLockNeeded: () => boolean;
}

export const useSecurityStore = create<SecurityState>()((set, get) => ({
    isLocked: false,
    pin: null,
    pattern: null,
    biometricsEnabled: false,
    lastBackgroundTime: null,
    lockGracePeriod: 0, // Instant lock

    initialize: async () => {
        const pin = await storage.getItem('app_lock_pin');
        const pattern = await storage.getItem('app_lock_pattern');
        const bioStr = await storage.getItem('biometrics_enabled');
        set({
            pin,
            pattern,
            biometricsEnabled: bioStr === 'true',
            isLocked: !!pin || !!pattern || bioStr === 'true' // Lock on start if any method exists
        });
    },

    setLocked: (locked: boolean) => set({ isLocked: locked, lastBackgroundTime: null }),

    setPin: async (pin: string | null) => {
        const { securityApi } = await import('@/api/security');
        if (pin) {
            await securityApi.setLock('pin', pin);
            await storage.setItem('app_lock_pin', pin);
        } else {
            // Clearing lock
            await storage.removeItem('app_lock_pin');
        }
        set({ pin, pattern: null });
    },

    setPattern: async (pattern: string | null) => {
        const { securityApi } = await import('@/api/security');
        if (pattern) {
            await securityApi.setLock('pattern', pattern);
            await storage.setItem('app_lock_pattern', pattern);
        } else {
            await storage.removeItem('app_lock_pattern');
        }
        set({ pattern, pin: null });
    },

    toggleBiometrics: async (enabled: boolean) => {
        const { securityApi } = await import('@/api/security');
        await securityApi.updateSettings({ biometrics_enabled: enabled });
        await storage.setItem('biometrics_enabled', String(enabled));
        set({ biometricsEnabled: enabled });
    },

    recordBackgroundTime: () => set({ lastBackgroundTime: Date.now() }),

    checkLockNeeded: () => {
        const { pin, pattern, biometricsEnabled } = get();
        if (!pin && !pattern && !biometricsEnabled) return false;
        // Requirement: "Even if the app is reopened within 1 second -> require authentication"
        return true; 
    },
}));
