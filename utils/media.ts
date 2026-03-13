import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ensureHttps } from './url';

/**
 * Determines the correct backend base URL for the current runtime environment.
 *
 * Priority:
 *  1. Expo Extra config `BACKEND_URL` (set in app.json / app.config.js)
 *  2. Auto-detected LAN host from Metro bundler (DEV only, real device safe)
 *  3. Android emulator localhost bridge (10.0.2.2)
 *  4. Production URL
 */
const getBaseMediaUrl = (): string => {
    const PROD = 'https://loveable-backend-url.onrender.com';

    // Allow override via app.json extra.BACKEND_URL
    const configUrl = (Constants.expoConfig?.extra as any)?.BACKEND_URL as string | undefined;
    if (configUrl) return configUrl.replace(/\/+$/, '');

    if (__DEV__) {
        // Metro reports its host:port as hostUri — split off the port
        const hostUri = Constants.expoConfig?.hostUri ?? '';
        const host = hostUri.split(':')[0];

        if (host && host !== 'localhost' && host !== '127.0.0.1') {
            // Physical device on LAN — use the actual Metro host IP
            return `http://${host}:8000`;
        }

        // Android emulator: 10.0.2.2 maps to the host machine's localhost
        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8000';
        }

        // iOS simulator — localhost works directly
        return 'http://localhost:8000';
    }

    return PROD;
};

const BASE_MEDIA_URL = getBaseMediaUrl().trim();

/**
 * Ensures that a media URL from the backend is fully qualified.
 *
 * - If already absolute (http/https) → returned as-is
 * - If relative ("/media/...") → prepends the correct backend host
 * - If null/undefined/empty → returns null
 */
export const getMediaUrl = (url: string | null | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return ensureHttps(url) ?? null;
    }

    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return ensureHttps(`${BASE_MEDIA_URL}${cleanUrl}`) ?? null;
};
