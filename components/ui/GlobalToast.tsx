import React, { useRef, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import Toast, { ToastRef, ToastOptions } from './Toast';
import { TOAST_EVENT } from '@/utils/toast';

const GlobalToast = () => {
    const toastRef = useRef<ToastRef>(null);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(TOAST_EVENT, (options: ToastOptions) => {
            toastRef.current?.show(options);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return <Toast ref={toastRef} />;
};

export default GlobalToast;
