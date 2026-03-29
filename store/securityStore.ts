import { create } from 'zustand';
import { storage } from '@/lib/storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface SecurityState {
    isLocked: boolean;
    pin: string | null;
    pattern: string | null;
    highSecurityType: 'none' | 'fingerprint' | 'face';
    lastBackgroundTime: number | null;
    lockGracePeriod: number; // in milliseconds, default 30s

    initialize: () => Promise<void>;
    setLocked: (locked: boolean) => void;
    setPin: (pin: string | null) => Promise<void>;
    setPattern: (pattern: string | null) => Promise<void>;
    setHighSecurity: (type: 'none' | 'fingerprint' | 'face') => Promise<void>;
    recordBackgroundTime: () => void;
    checkLockNeeded: () => boolean;
}

export const useSecurityStore = create<SecurityState>()((set, get) => ({
    isLocked: false,
    pin: null,
    pattern: null,
    highSecurityType: 'none',
    lastBackgroundTime: null,
    lockGracePeriod: 0, // Instant lock

    initialize: async () => {
        const pin = await storage.getItem('app_lock_pin');
        const pattern = await storage.getItem('app_lock_pattern');
        const highSec = await storage.getItem('high_security_type') as any || 'none';
        
        set({
            pin,
            pattern,
            highSecurityType: highSec,
            isLocked: !!pin || !!pattern || highSec !== 'none'
        });
    },

    setLocked: (locked: boolean) => set({ isLocked: locked, lastBackgroundTime: null }),

    setPin: async (pin: string | null) => {
        const { securityApi } = await import('@/api/security');
        if (pin) {
            await securityApi.setLock('pin', pin);
            await storage.setItem('app_lock_pin', pin);
        } else {
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

    setHighSecurity: async (type: 'none' | 'fingerprint' | 'face') => {
        const { securityApi } = await import('@/api/security');
        
        // Sync with backend
        await securityApi.updateSettings({ 
            biometrics_enabled: type === 'fingerprint',
            face_unlock_enabled: type === 'face'
        });

        await storage.setItem('high_security_type', type);
        set({ highSecurityType: type });
    },

    recordBackgroundTime: () => set({ lastBackgroundTime: Date.now() }),

    checkLockNeeded: () => {
        const { pin, pattern, highSecurityType } = get();
        if (!pin && !pattern && highSecurityType === 'none') return false;
        // Requirement: "Even if the app is reopened within 1 second -> require authentication"
        return true; 
    },
}));
