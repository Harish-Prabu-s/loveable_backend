import { DeviceEventEmitter } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
    onPress?: () => void;
}

const TOAST_EVENT = 'SHOW_PREMIUM_TOAST';

export const toast = {
    show: (options: ToastOptions | string) => {
        if (typeof options === 'string') {
            DeviceEventEmitter.emit(TOAST_EVENT, { message: options, type: 'info' });
        } else {
            DeviceEventEmitter.emit(TOAST_EVENT, options);
        }
    },
    success: (message: string, duration?: number, onPress?: () => void) => {
        DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'success', duration, onPress });
    },
    error: (message: string, duration?: number, onPress?: () => void) => {
        DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'error', duration, onPress });
    },
    info: (message: string, duration?: number, onPress?: () => void) => {
        DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'info', duration, onPress });
    },
};

export const usePremiumToast = () => {
    return toast;
};

export { TOAST_EVENT };
