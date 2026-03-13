import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { storage } from '../lib/storage';

const LAN_HOST = '10.153.68.184';

// Android APK uses fixed LAN host, web uses window.location.hostname
const getDefaultUrl = () => {
  if (Capacitor.getPlatform() === 'android') {
    return `http://${LAN_HOST}:8000/api`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api`;
  }
  return `http://${LAN_HOST}:8000/api`;
};

const getApiUrl = () => {
  // Use process.env which is compatible with both Vite (via define) and Expo
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return getDefaultUrl();
};

const BASE_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Use storage wrapper for cross-platform safety
    const token = typeof window !== 'undefined'
      ? window.localStorage.getItem('access_token')
      : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = typeof window !== 'undefined'
        ? window.localStorage.getItem('refresh_token')
        : null;
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('access_token', access);
          } else {
            await storage.setItem('access_token', access);
          }

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('access_token');
            window.localStorage.removeItem('refresh_token');
            window.localStorage.removeItem('user');
            window.location.href = '/login';
          } else {
            await storage.removeItem('access_token');
            await storage.removeItem('refresh_token');
            await storage.removeItem('user');
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
