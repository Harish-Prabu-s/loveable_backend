import { create } from 'zustand';
import { storage } from '@/lib/storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface SecurityState {
    isLocked: boolean;
    pin: string | null;
    biometricsEnabled: boolean;
    lastBackgroundTime: number | null;
    lockGracePeriod: number; // in milliseconds, default 30s

    initialize: () => Promise<void>;
    setLocked: (locked: boolean) => void;
    setPin: (pin: string | null) => Promise<void>;
    toggleBiometrics: (enabled: boolean) => Promise<void>;
    recordBackgroundTime: () => void;
    checkLockNeeded: () => boolean;
}

export const useSecurityStore = create<SecurityState>()((set, get) => ({
    isLocked: false,
    pin: null,
    biometricsEnabled: false,
    lastBackgroundTime: null,
    lockGracePeriod: 30000, // 30 seconds

    initialize: async () => {
        const pin = await storage.getItem('app_lock_pin');
        const bioStr = await storage.getItem('biometrics_enabled');
        set({
            pin,
            biometricsEnabled: bioStr === 'true',
            isLocked: !!pin // Lock on start if PIN exists
        });
    },

    setLocked: (locked: boolean) => set({ isLocked: locked, lastBackgroundTime: null }),

    setPin: async (pin: string | null) => {
        if (pin) {
            await storage.setItem('app_lock_pin', pin);
        } else {
            await storage.removeItem('app_lock_pin');
        }
        set({ pin });
    },

    toggleBiometrics: async (enabled: boolean) => {
        await storage.setItem('biometrics_enabled', String(enabled));
        set({ biometricsEnabled: enabled });
    },

    recordBackgroundTime: () => set({ lastBackgroundTime: Date.now() }),

    checkLockNeeded: () => {
        const { lastBackgroundTime, lockGracePeriod, pin } = get();
        if (!pin) return false;
        if (!lastBackgroundTime) return false;

        const timeInBackground = Date.now() - lastBackgroundTime;
        return timeInBackground > lockGracePeriod;
    },
}));
