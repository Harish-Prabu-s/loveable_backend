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
    accent: string;
    accentLight: string;
    danger: string;
    success: string;
    card: string;
    tabBar: string;
    statusBar: 'dark' | 'light';
}

const DARK: ThemeColors = {
    background: '#0A091E',
    surface: 'rgba(26, 22, 50, 0.7)',
    surfaceAlt: 'rgba(37, 33, 64, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#D946EF', // Fuchsia
    primaryLight: 'rgba(217, 70, 239, 0.2)',
    accent: '#8B5CF6', // Violet
    accentLight: 'rgba(139, 92, 246, 0.2)',
    danger: '#F43F5E',
    success: '#10B981',
    card: '#16152B',
    tabBar: '#0A091E',
    statusBar: 'light',
};

const LIGHT: ThemeColors = {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    primary: '#9333EA',
    primaryLight: 'rgba(147,51,234,0.1)',
    accent: '#DB2777',
    accentLight: 'rgba(219,39,119,0.1)',
    danger: '#E11D48',
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
