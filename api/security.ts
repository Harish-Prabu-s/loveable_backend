import client from './client';

export interface SecurityStatus {
    success: boolean;
    message: string;
}

export const securityApi = {
    /**
     * Sets or updates the app lock (PIN)
     */
    setLock: async (lockType: 'pin' | 'pattern', value: string): Promise<SecurityStatus> => {
        const res = await client.post('/security/set-lock/', { lock_type: lockType, value });
        return res.data;
    },

    /**
     * Verifies the app lock value with the backend
     */
    verifyLock: async (value: string): Promise<SecurityStatus> => {
        const res = await client.post('/security/verify-lock/', { value });
        return res.data;
    },

    /**
     * Toggles biometric or face unlock settings
     */
    updateSettings: async (settings: { 
        biometrics_enabled?: boolean; 
        face_unlock_enabled?: boolean 
    }): Promise<SecurityStatus> => {
        const res = await client.post('/security/update-settings/', settings);
        return res.data;
    },

    /**
     * Initiates a lock reset by sending an OTP to the user's email
     */
    initReset: async (): Promise<SecurityStatus> => {
        const res = await client.post('/security/reset-init/');
        return res.data;
    },

    /**
     * Verifies the reset OTP and clears the app lock if successful
     */
    verifyReset: async (code: string): Promise<SecurityStatus> => {
        const res = await client.post('/security/reset-verify/', { code });
        return res.data;
    }
};

export default securityApi;
