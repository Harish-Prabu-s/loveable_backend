import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error(`Storage getItem error [${key}]:`, e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (value === null || value === undefined) {
        console.warn(`Storage setItem: skipping ${key} because value is null or undefined`);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error(`Storage setItem error [${key}]:`, e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error(`Storage removeItem error [${key}]:`, e);
    }
  },
  // SecureStore is strictly async. Returning null for sync access.
  getItemSync: (key: string): string | null => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return null;
  },
};
