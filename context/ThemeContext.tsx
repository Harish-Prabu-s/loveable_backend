/**
 * ThemeContext — Global Dark/Light theme with AsyncStorage persistence.
 *
 * Usage:
 *   import { useTheme } from '@/context/ThemeContext';
 *   const { theme, toggleTheme, isDark } = useTheme();
 *
 * Wrap the root layout with <ThemeProvider>.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type ThemeMode = 'dark' | 'light';

interface ThemeColors {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryLight: string;
    danger: string;
    success: string;
    card: string;
    tabBar: string;
    statusBar: 'dark' | 'light';
}

const DARK: ThemeColors = {
    background: '#020617',
    surface: '#0F172A',
    surfaceAlt: '#1E293B',
    border: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#475569',
    primary: '#8B5CF6',
    primaryLight: 'rgba(139,92,246,0.15)',
    danger: '#EF4444',
    success: '#10B981',
    card: '#0F172A',
    tabBar: '#090E1A',
    statusBar: 'light',
};

const LIGHT: ThemeColors = {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    primary: '#7C3AED',
    primaryLight: 'rgba(124,58,237,0.1)',
    danger: '#DC2626',
    success: '#059669',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    statusBar: 'dark',
};

interface ThemeContextType {
    theme: ThemeMode;
    colors: ThemeColors;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (t: ThemeMode) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    colors: DARK,
    isDark: true,
    toggleTheme: () => { },
    setTheme: () => { },
});

const STORAGE_KEY = '@app_theme';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeMode>('dark');

    // Load saved theme from AsyncStorage on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            if (saved === 'dark' || saved === 'light') {
                setThemeState(saved);
            } else {
                // Default to system preference, fallback to dark
                setThemeState(systemScheme === 'light' ? 'light' : 'dark');
            }
        });
    }, []);

    const setTheme = (t: ThemeMode) => {
        setThemeState(t);
        AsyncStorage.setItem(STORAGE_KEY, t);
    };

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const colors = theme === 'dark' ? DARK : LIGHT;
    const isDark = theme === 'dark';

    return (
        <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
    return useContext(ThemeContext);
}

export default ThemeContext;
