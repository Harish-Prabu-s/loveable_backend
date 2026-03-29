import axios from 'axios';
import { storage } from '@/lib/storage';
import { DeviceEventEmitter } from 'react-native';
import { ensureHttps } from '@/utils/url';

const getBaseUrl = () => {
  // Production server URL
  const prodUrl = 'https://loveable.sbs/api/';
  console.log(`[API] Using Base URL: ${prodUrl}`);
  return prodUrl;
};

export const BASE_URL = getBaseUrl().trim();

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // Increased to 120s for video uploads
});

// Bare client for refresh to avoid interceptor recursion
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

const logout = async () => {
  console.log('[API] Global Logout Triggered');
  await Promise.all([
    storage.removeItem('accessToken'),
    storage.removeItem('refreshToken'),
    storage.removeItem('user'),
    storage.removeItem('temp_token'),
  ]);
  DeviceEventEmitter.emit('auth:logout');
};

// Request Interceptor: Auth, HTTPS, Logging
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('accessToken');
    const tempToken = await storage.getItem('temp_token');
    const activeToken = token || tempToken;

    if (activeToken) {
      config.headers.Authorization = `Bearer ${activeToken}`;
    }

    // Skip ngrok browser warning for mobile app requests
    config.headers['ngrok-skip-browser-warning'] = 'true';

    // Force HTTPS for production/external URLs
    if (config.url?.startsWith('http')) {
      config.url = ensureHttps(config.url) || config.url;
    }

    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      console.log(`[API Headers]`, config.headers);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const replaceNgrokUrls = (obj: any): any => {
  if (typeof obj === 'string') {
    if (obj.includes('ngrok-free.dev')) {
      try {
        const urlObj = new URL(obj);
        const baseOrigin = new URL(BASE_URL).origin;
        return `${baseOrigin}${urlObj.pathname}${urlObj.search}`;
      } catch {
        return obj;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(replaceNgrokUrls);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = replaceNgrokUrls(obj[key]);
    }
    return newObj;
  }
  return obj;
};

// Response Interceptor: 401 Refresh & Logging
apiClient.interceptors.response.use(
  (response) => {
    response.data = replaceNgrokUrls(response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (__DEV__) {
      if (error.response) {
        console.error(`[API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response.status, error.response.data);
      } else if (error.request) {
        console.error(`[API Network Error] No response received from server. config:`, error.config);
      } else {
        console.error(`[API Error]`, error.message);
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry if it's already an auth endpoint failing (except auth/me which we use for validation)
      if (originalRequest.url?.includes('auth/') && !originalRequest.url?.includes('auth/me')) {
        console.warn('[API] Auth endpoint failed with 401. Logging out.');
        await logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = await storage.getItem('refreshToken');

      if (refreshToken) {
        try {
          console.log('[API] Attempting token refresh...');
          const response = await refreshClient.post('auth/refresh/', { refresh: refreshToken });

          // Handle both 'access' and 'access_token' from standardized backend
          const newAccessToken = response.data.access || response.data.access_token;
          const newRefreshToken = response.data.refresh || response.data.refresh_token;

          if (newAccessToken) {
            console.log('[API] Refresh successful');
            await storage.setItem('accessToken', newAccessToken);
            if (newRefreshToken) {
              await storage.setItem('refreshToken', newRefreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.error('[API] Refresh failed. Logging out.', refreshError);
          await logout();
        }
      } else {
        console.warn('[API] No refresh token available. Logging out.');
        await logout();
      }
    }

    return Promise.reject(error);
  }
);

// Helper for fetch-based calls (like file uploads)
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  let token = await storage.getItem('accessToken');
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const getHeaders = (t: string | null) => ({
    ...options.headers,
    ...(t ? { 'Authorization': `Bearer ${t}` } : {}),
    'ngrok-skip-browser-warning': 'true'
  });

  let response = await fetch(url, { ...options, headers: getHeaders(token) });

  if (response.status === 401) {
    try {
      // Trigger token refresh via apiClient (which handles 401 logic)
      await apiClient.get('auth/me/');
      token = await storage.getItem('accessToken');
      response = await fetch(url, { ...options, headers: getHeaders(token) });
    } catch {
      // If refresh fails, original status persists
    }
  }

  return response;
};

export default apiClient;


