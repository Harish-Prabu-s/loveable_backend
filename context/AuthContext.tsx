import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingData {
    email: string;
    gender: string;
    language: string;
}

export interface AuthState {
    token: string | null;
    tempToken: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    onboardingData: OnboardingData;
}

type AuthAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
    | { type: 'SET_TEMP_TOKEN'; payload: { token: string; user: User } }
    | { type: 'SET_ONBOARDING_DATA'; payload: Partial<OnboardingData> }
    | { type: 'LOGOUT' }
    | { type: 'SET_USER'; payload: User }
    | { type: 'INITIALIZE'; payload: { token: string; user: User; tempToken?: string | null } | null };

interface AuthContextType extends AuthState {
    dispatch: React.Dispatch<AuthAction>;
    login: (token: string, user: User, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    syncUser: (user: User) => Promise<void>;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AuthState = {
    token: null,
    tempToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: true, // IMPORTANT: Start as loading until AsyncStorage is checked
    onboardingData: {
        email: '',
        gender: '',
        language: '',
    },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'INITIALIZE':
            if (action.payload) {
                return {
                    ...state,
                    token: action.payload.token,
                    tempToken: action.payload.tempToken || null,
                    user: action.payload.user,
                    isAuthenticated: !!action.payload.token,
                    isLoading: false,
                };
            }
            return { ...state, isLoading: false, isAuthenticated: false };

        case 'LOGIN_SUCCESS':
            return {
                ...state,
                token: action.payload.token,
                user: action.payload.user,
                isAuthenticated: true,
                isLoading: false,
                tempToken: null,
            };

        case 'SET_TEMP_TOKEN':
            return {
                ...state,
                tempToken: action.payload.token,
                user: action.payload.user,
                isAuthenticated: false, // tempToken is not fully authenticated
                isLoading: false,
            };

        case 'SET_ONBOARDING_DATA':
            return {
                ...state,
                onboardingData: { ...state.onboardingData, ...action.payload },
            };

        case 'LOGOUT':
            return {
                ...initialState,
                isLoading: false,
            };

        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
            };

        default:
            return state;
    }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const logout = React.useCallback(async () => {
        console.log('[AuthContext] logout() start');
        await Promise.all([
            storage.removeItem('accessToken'),
            storage.removeItem('refreshToken'),
            storage.removeItem('user'),
            storage.removeItem('temp_token'),
        ]);
        // Also sync Zustand store
        useAuthStore.getState().logout();
        dispatch({ type: 'LOGOUT' });
        console.log('[AuthContext] logout() complete');
    }, []);

    // Initialize from AsyncStorage on mount
    useEffect(() => {
        const initialize = async () => {
            try {
                const [token, userStr, tempToken] = await Promise.all([
                    storage.getItem('accessToken'),
                    storage.getItem('user'),
                    storage.getItem('temp_token'),
                ]);

                console.log(`[AuthContext] Init - Token: ${!!token}, UserObj: ${!!userStr}, TempToken: ${!!tempToken}`);

                if (token && userStr) {
                    const user: User = JSON.parse(userStr);
                    dispatch({ type: 'INITIALIZE', payload: { token, user, tempToken } });
                } else if (tempToken) {
                    // Try to get user if it exists in storage even with tempToken
                    const user = userStr ? JSON.parse(userStr) : {} as any;
                    dispatch({ type: 'INITIALIZE', payload: { token: '', user, tempToken } });
                } else {
                    dispatch({ type: 'INITIALIZE', payload: null });
                }
            } catch (e) {
                console.error('AuthContext initialization error:', e);
                dispatch({ type: 'INITIALIZE', payload: null });
            }
        };

        initialize();

        // Listen for logouts from external triggers (like apiClient response interceptor passing 401s)
        const logoutListener = DeviceEventEmitter.addListener('auth:logout', () => {
            logout();
        });

        return () => {
            logoutListener.remove();
        };
    }, [logout]);

    const login = React.useCallback(async (token: string, user: User, refreshToken?: string) => {
        console.log(`[AuthContext] login() start for user ${user?.id}`);

        // 1. Save to Storage
        await Promise.all([
            storage.setItem('accessToken', token),
            storage.setItem('user', JSON.stringify(user)),
            refreshToken ? storage.setItem('refreshToken', refreshToken) : Promise.resolve(),
            storage.removeItem('temp_token')
        ]);

        // 2. Sync Zustand
        useAuthStore.setState({
            token,
            user,
            isAuthenticated: true,
            tempToken: null
        });

        // 3. Update local state
        dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
        console.log('[AuthContext] login() complete');
    }, []);

    const syncUser = React.useCallback(async (user: User) => {
        console.log(`[AuthContext] syncUser() start for user ${user?.id}`);
        await storage.setItem('user', JSON.stringify(user));
        useAuthStore.setState({ user });
        dispatch({ type: 'SET_USER', payload: user });
        console.log('[AuthContext] syncUser() complete');
    }, []);

    const contextValue = React.useMemo(() => ({
        ...state,
        dispatch,
        login,
        logout,
        syncUser
    }), [state, login, logout, syncUser]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
