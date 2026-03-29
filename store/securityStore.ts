import { create } from 'zustand';
import { storage } from '@/lib/storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface SecurityState {
    isLocked: boolean;
    pin: string | null;
    pattern: string | null;
    highSecurityType: 'none' | 'fingerprint' | 'face';
    faceData: any | null;
    fingerprintData: any | null;
    lastBackgroundTime: number | null;
    lockGracePeriod: number; // in milliseconds, default 30s

    initialize: () => Promise<void>;
    setLocked: (locked: boolean) => void;
    setPin: (pin: string | null) => Promise<void>;
    setPattern: (pattern: string | null) => Promise<void>;
    setHighSecurity: (type: 'none' | 'fingerprint' | 'face') => Promise<void>;
    enrollBiometrics: (type: 'face' | 'fingerprint', data: any) => Promise<void>;
    recordBackgroundTime: () => void;
    checkLockNeeded: () => boolean;
}

export const useSecurityStore = create<SecurityState>()((set, get) => ({
    isLocked: false,
    pin: null,
    pattern: null,
    highSecurityType: 'none',
    faceData: null,
    fingerprintData: null,
    lastBackgroundTime: null,
    lockGracePeriod: 0, // Instant lock

    initialize: async () => {
        const pin = await storage.getItem('app_lock_pin');
        const pattern = await storage.getItem('app_lock_pattern');
        const highSec = await storage.getItem('high_security_type') as any || 'none';
        const faceData = await storage.getItem('face_registration_data');
        const fingerprintData = await storage.getItem('fingerprint_registration_data');
        
        set({
            pin,
            pattern,
            highSecurityType: highSec,
            faceData: faceData ? JSON.parse(faceData) : null,
            fingerprintData: fingerprintData ? JSON.parse(fingerprintData) : null,
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

    enrollBiometrics: async (type: 'face' | 'fingerprint', data: any) => {
        const { securityApi } = await import('@/api/security');
        
        const payload: any = {};
        if (type === 'face') {
            payload.face_registration_data = data;
            await storage.setItem('face_registration_data', JSON.stringify(data));
            set({ faceData: data });
        } else {
            payload.fingerprint_registration_data = data;
            await storage.setItem('fingerprint_registration_data', JSON.stringify(data));
            set({ fingerprintData: data });
        }

        await securityApi.updateSettings(payload);
        await get().setHighSecurity(type);
    },

    recordBackgroundTime: () => set({ lastBackgroundTime: Date.now() }),

    checkLockNeeded: () => {
        const { pin, pattern, highSecurityType } = get();
        if (!pin && !pattern && highSecurityType === 'none') return false;
        // Requirement: "Even if the app is reopened within 1 second -> require authentication"
        return true; 
    },
}));
