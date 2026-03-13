import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { BackHandler, Platform } from 'react-native';
import { toast } from '@/utils/toast';

const SHAKE_THRESHOLD = 2.5;
const DOUBLE_SHAKE_WINDOW = 2000; // 2 seconds

export const useShakeToClose = () => {
    const [lastShake, setLastShake] = useState(0);
    const subscription = useRef<any>(null);

    useEffect(() => {
        _subscribe();
        return () => _unsubscribe();
    }, [lastShake]);

    const _subscribe = () => {
        subscription.current = Accelerometer.addListener(accelerometerData => {
            const { x, y, z } = accelerometerData;
            const acceleration = Math.sqrt(x * x + y * y + z * z);

            if (acceleration > SHAKE_THRESHOLD) {
                const now = Date.now();
                if (now - lastShake < DOUBLE_SHAKE_WINDOW) {
                    // Double shake detected
                    if (Platform.OS === 'android') {
                        BackHandler.exitApp();
                    } else {
                        toast.info("Shake to exit not supported on iOS");
                    }
                } else {
                    // First shake
                    setLastShake(now);
                    toast.info("Shake again to close Vibely", 2000);
                }
            }
        });

        Accelerometer.setUpdateInterval(100);
    };

    const _unsubscribe = () => {
        subscription.current && subscription.current.remove();
        subscription.current = null;
    };
};
