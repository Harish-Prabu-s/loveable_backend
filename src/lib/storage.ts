import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  },
  // Synchronous-like access for initial state (will return null on first render if async)
  // This is a helper for Zustand initial state
  getItemSync: (key: string): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null; // AsyncStorage doesn't have a sync getter
  }
};
