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
    failCount: number;
    lockoutUntil: number | null;

    initialize: () => Promise<void>;
    setLocked: (locked: boolean) => void;
    setPin: (pin: string | null) => Promise<void>;
    setPattern: (pattern: string | null) => Promise<void>;
    setHighSecurity: (type: 'none' | 'fingerprint' | 'face') => Promise<void>;
    enrollBiometrics: (type: 'face' | 'fingerprint', data: any) => Promise<void>;
    clearAllSecurityData: () => Promise<void>;
    recordBackgroundTime: () => void;
    checkLockNeeded: () => boolean;
    incrementFailCount: () => Promise<void>;
    resetFailCount: () => Promise<void>;
    isBypassed: boolean;
    setBypassLock: (bypass: boolean) => void;
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
    failCount: 0,
    isBypassed: false,
    lockoutUntil: null,

    setBypassLock: (bypass: boolean) => set({ isBypassed: bypass }),

    initialize: async () => {
        const pin = await storage.getItem('app_lock_pin');
        const pattern = await storage.getItem('app_lock_pattern');
        const highSec = await storage.getItem('high_security_type') as any || 'none';
        const faceData = await storage.getItem('face_registration_data');
        const fingerprintData = await storage.getItem('fingerprint_registration_data');
        const failCount = await storage.getItem('app_lock_fail_count');
        const lockoutUntil = await storage.getItem('app_lock_lockout_until');
        
        // Clean up empty strings or nulls to force null type
        const cleanPin = (pin && pin.length > 0) ? pin : null;
        const cleanPattern = (pattern && pattern.length > 0) ? pattern : null;
        
        set({
            pin: cleanPin,
            pattern: cleanPattern,
            highSecurityType: highSec,
            faceData: faceData ? JSON.parse(faceData) : null,
            fingerprintData: fingerprintData ? JSON.parse(fingerprintData) : null,
            failCount: failCount ? parseInt(failCount) : 0,
            lockoutUntil: lockoutUntil ? parseInt(lockoutUntil) : null,
            isLocked: !!cleanPin || !!cleanPattern || highSec !== 'none'
        });
    },

    setLocked: (locked: boolean) => set({ isLocked: locked, lastBackgroundTime: null }),

    setPin: async (pin: string | null) => {
        const { securityApi } = await import('@/api/security');
        if (pin) {
            await securityApi.setLock('pin', pin);
            await securityApi.updateSettings({ app_lock_type: 'pin' });
            await storage.setItem('app_lock_pin', pin);
        } else {
            await securityApi.updateSettings({ app_lock_type: 'none' });
            await storage.removeItem('app_lock_pin');
        }
        set({ pin, pattern: null });
    },

    setPattern: async (pattern: string | null) => {
        const { securityApi } = await import('@/api/security');
        if (pattern) {
            await securityApi.setLock('pattern', pattern);
            await securityApi.updateSettings({ app_lock_type: 'pattern' });
            await storage.setItem('app_lock_pattern', pattern);
        } else {
            await securityApi.updateSettings({ app_lock_type: 'none' });
            await storage.removeItem('app_lock_pattern');
        }
        set({ pattern, pin: null });
    },

    setHighSecurity: async (type: 'none' | 'fingerprint' | 'face') => {
        const { securityApi } = await import('@/api/security');
        
        // Sync with backend
        await securityApi.updateSettings({ 
            biometrics_enabled: type === 'fingerprint',
            face_unlock_enabled: type === 'face',
            app_lock_type: type !== 'none' ? 'biometric' : 'none'
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
    
    clearAllSecurityData: async () => {
        const { securityApi } = await import('@/api/security');
        
        // 1. Wipe backend
        await securityApi.updateSettings({ wipe: true } as any);
        
        // 2. Clear local storage
        await Promise.all([
            storage.removeItem('app_lock_pin'),
            storage.removeItem('app_lock_pattern'),
            storage.removeItem('high_security_type'),
            storage.removeItem('face_registration_data'),
            storage.removeItem('fingerprint_registration_data'),
        ]);
        
        // 3. Update store state
        set({
            pin: null,
            pattern: null,
            highSecurityType: 'none',
            faceData: null,
            fingerprintData: null,
            isLocked: false
        });
    },

    recordBackgroundTime: () => set({ lastBackgroundTime: Date.now() }),

    checkLockNeeded: () => {
        const { pin, pattern, highSecurityType, isBypassed } = get();
        if (isBypassed) return false;
        if (!pin && !pattern && highSecurityType === 'none') return false;
        // Requirement: "Even if the app is reopened within 1 second -> require authentication"
        return true; 
    },

    incrementFailCount: async () => {
        const newCount = get().failCount + 1;
        let lockoutUntil: number | null = null;
        
        if (newCount >= 5) {
            // Lock for 30 seconds
            lockoutUntil = Date.now() + 30000;
            await storage.setItem('app_lock_lockout_until', lockoutUntil.toString());
        }
        
        await storage.setItem('app_lock_fail_count', newCount.toString());
        set({ failCount: newCount, lockoutUntil });
    },

    resetFailCount: async () => {
        await storage.removeItem('app_lock_fail_count');
        await storage.removeItem('app_lock_lockout_until');
        set({ failCount: 0, lockoutUntil: null });
    },
}));
