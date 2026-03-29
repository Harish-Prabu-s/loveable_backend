import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Switch,
    TouchableOpacity, Alert, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsApi } from '@/api/notifications';
import { useAuth } from '@/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { useSecurityStore } from '@/store/securityStore';
import { authApi } from '@/api/auth';
import { useTheme } from '@/context/ThemeContext';
import * as LocalAuthentication from 'expo-local-authentication';
import { useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserSettings {
    theme: string;
    call_preference: string;
    app_lock_type: string;
    notifications_enabled: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
    return (
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name={icon as any} size={16} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

function SettingRow({
    icon, iconBg, label, right, onPress, danger = false,
}: {
    icon: string; iconBg: string; label: string; right?: React.ReactNode;
    onPress?: () => void; danger?: boolean;
}) {
    return (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name={icon as any} size={20} color={danger ? '#EF4444' : '#fff'} />
            </View>
            <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
            <View style={styles.rowRight}>{right}</View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const { logout: authContextLogout, user: authUser } = useAuth();
    const { user, logout: storeLogout } = useAuthStore();
    const { setHighSecurity, setPin, highSecurityType, clearAllSecurityData } = useSecurityStore();
    const { isDark, setTheme } = useTheme();
    const isFocused = useIsFocused();
    const gender = user?.gender ?? authUser?.gender;

    const [settings, setSettings] = useState<UserSettings>({
        theme: 'dark',
        call_preference: 'both',
        app_lock_type: 'none',
        notifications_enabled: true,
    });
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [saving, setSaving] = useState(false);

    // ── Load settings ─────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const s = await notificationsApi.getSettings().catch(() => null);
                if (s) setSettings(s);
            } catch { /* silent */ }
            const bio = await LocalAuthentication.hasHardwareAsync().catch(() => false);
            setBiometricAvailable(bio);
        };
        if (isFocused) {
            load();
        }
    }, [isFocused]);

    // ── Persist settings ──────────────────────────────────────────────────────
    const update = async (patch: Partial<UserSettings>) => {
        const updated = { ...settings, ...patch };
        setSettings(updated);
        setSaving(true);
        try {
            await notificationsApi.updateSettings(updated);
        } catch {
            Alert.alert('Error', 'Could not save setting. Changes will reset next load.');
        } finally {
            setSaving(false);
        }
    };

    // ── Logout — clears BOTH authContext + authStore + AsyncStorage ───────────
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            try {
                                await authApi.logout();
                            } catch (apiError) {
                                console.error('API Logout failed:', apiError);
                            }

                            // 1. Clear AsyncStorage directly (belt and suspenders)
                            await Promise.all([
                                AsyncStorage.removeItem('access_token'),
                                AsyncStorage.removeItem('refresh_token'),
                                AsyncStorage.removeItem('user'),
                                AsyncStorage.removeItem('temp_token'),
                            ]);
                            // 2. Clear AuthContext state (dispatches LOGOUT reducer)
                            await authContextLogout();
                            // 3. Clear Zustand AuthStore state
                            await storeLogout();

                            // Let the _layout.tsx useProtectedRoute handle redirect automatically!
                            // Calling router.replace here often creates a race condition with the context unmount.
                        } catch (e) {
                            console.error('Logout failed:', e);
                        }
                    },
                },
            ]
        );
    };

    // ── Call preference picker ────────────────────────────────────────────────
    const chooseCallPref = () => {
        Alert.alert('Call Preference', 'Who can call you?', [
            { text: '📞 Audio & Video (Both)', onPress: () => update({ call_preference: 'both' }) },
            { text: '🎧 Audio Only', onPress: () => update({ call_preference: 'audio' }) },
            { text: '📹 Video Only', onPress: () => update({ call_preference: 'video' }) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    // ── App lock picker ───────────────────────────────────────────────────────
    const chooseAppLock = () => {
        const options: any[] = [
            { text: '🔢 PIN', onPress: () => router.push('/settings/set-pin' as any) },
            { text: '🔷 Pattern', onPress: () => router.push('/settings/set-pattern' as any) },
            { text: '🔑 Forgot PIN / Recovery', onPress: () => router.push('/settings/reset-app-lock' as any) },
        ];
        if (biometricAvailable) {
            options.push({ text: '📸 Face Lock', onPress: () => router.push('/settings/biometric-setup' as any) });
            options.push({ text: '👆 Fingerprint Lock', onPress: () => router.push('/settings/biometric-setup' as any) });
        }
        
        if (settings.app_lock_type !== 'none' || highSecurityType !== 'none') {
            options.unshift({ text: '🔓 Disable App Lock', style: 'destructive', onPress: () => {
                update({ app_lock_type: 'none' });
                setHighSecurity('none');
                setPin(null);
            } });
        }

        options.push({ text: 'Cancel', style: 'cancel' });
        Alert.alert('App Lock', 'Choose lock method', options);
    };

    const callPrefLabel: Record<string, string> = {
        both: 'Audio & Video',
        audio: 'Audio Only',
        video: 'Video Only',
    };
    const lockLabel: Record<string, string> = {
        none: 'Off', pin: 'PIN', pattern: 'Pattern', biometric: 'Biometric',
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {/* Header */}
            <LinearGradient colors={['#1E1B4B', '#020617']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                {saving && (
                    <Text style={styles.savingText}>Saving…</Text>
                )}
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Account ─────────────────────────────────────────── */}
                <SectionHeader title="Account" icon="account-circle" />
                <View style={styles.card}>
                    <SettingRow
                        icon="account-edit"
                        iconBg="#3B82F6"
                        label="Edit Profile"
                        onPress={() => router.push('/settings/edit-profile' as any)}
                        right={<MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />}
                    />
                    <SettingRow
                        icon="delete-forever"
                        iconBg="#991B1B"
                        label="Delete Account"
                        onPress={() => router.push('/settings/delete-account' as any)}
                        right={<MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />}
                    />
                </View>

                {/* ── Appearance ──────────────────────────────────────── */}
                <SectionHeader title="Appearance" icon="palette" />
                <View style={styles.card}>
                    <SettingRow
                        icon="theme-light-dark"
                        iconBg="#7C3AED"
                        label="Dark Mode"
                        right={
                            <Switch
                                value={isDark}
                                onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
                                trackColor={{ false: '#CBD5E1', true: '#8B5CF6' }}
                                thumbColor="#FFF"
                            />
                        }
                    />
                </View>

                {/* ── Notifications ────────────────────────────────────── */}
                <SectionHeader title="Notifications" icon="bell" />
                <View style={styles.card}>
                    <SettingRow
                        icon="bell-ring"
                        iconBg="#D97706"
                        label="Push Notifications"
                        right={
                            <Switch
                                value={settings.notifications_enabled}
                                onValueChange={(v) => update({ notifications_enabled: v })}
                                trackColor={{ false: '#334155', true: '#8B5CF6' }}
                                thumbColor="#FFF"
                            />
                        }
                    />
                </View>

                {/* ── Calls ────────────────────────────────────────────── */}
                <SectionHeader title={`Calls ${gender === 'F' ? '🔒' : ''}`} icon="phone" />
                <View style={styles.card}>
                    <SettingRow
                        icon="phone-settings"
                        iconBg="#0F766E"
                        label="Who Can Call Me"
                        onPress={chooseCallPref}
                        right={
                            <View style={styles.valuePill}>
                                <Text style={styles.valuePillText}>
                                    {callPrefLabel[settings.call_preference] ?? settings.call_preference}
                                </Text>
                                <MaterialCommunityIcons name="chevron-right" size={18} color="#8B5CF6" />
                            </View>
                        }
                    />
                </View>
                {gender === 'F' && (
                    <Text style={styles.hint}>
                        🔒 Safety tip: restrict incoming call types to audio-only for extra privacy.
                    </Text>
                )}

                {/* ── Security ─────────────────────────────────────────── */}
                <SectionHeader title="Security & Authentication" icon="shield-lock" />
                <View style={styles.card}>
                    <SettingRow
                        icon="lock"
                        iconBg="#1D4ED8"
                        label="App Lock"
                        onPress={chooseAppLock}
                        right={
                            <View style={styles.valuePill}>
                                <Text style={styles.valuePillText}>
                                    {lockLabel[settings.app_lock_type] ?? settings.app_lock_type}
                                </Text>
                                <MaterialCommunityIcons name="chevron-right" size={18} color="#8B5CF6" />
                            </View>
                        }
                    />
                    
                    {settings.app_lock_type === 'pin' && (
                        <SettingRow
                            icon="lock-reset"
                            iconBg="#7C3AED"
                            label="Change PIN"
                            onPress={() => router.push('/settings/set-pin' as any)}
                            right={<MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />}
                        />
                    )}

                    {biometricAvailable && (
                        <SettingRow
                            icon="fingerprint"
                            iconBg="#0F766E"
                            label="Face ID / Biometric"
                            onPress={() => {
                                if (settings.app_lock_type === 'biometric') {
                                    Alert.alert('Disable Biometric', 'Are you sure you want to disable biometric authentication?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Disable', style: 'destructive', onPress: () => {
                                            update({ app_lock_type: 'none' });
                                            setHighSecurity('none');
                                        }}
                                    ]);
                                } else {
                                    router.push('/settings/biometric-setup' as any);
                                }
                            }}
                            right={
                                <View style={styles.valuePill}>
                                    <Text style={styles.valuePillText}>
                                        {settings.app_lock_type === 'biometric' ? 'Enabled' : 'Setup'}
                                    </Text>
                                    <MaterialCommunityIcons name="chevron-right" size={18} color="#8B5CF6" />
                                </View>
                            }
                        />
                    )}

                    <View style={styles.divider} />
                    
                    <SettingRow
                        icon="shield-off"
                        iconBg="#DC2626"
                        label="Reset Security Settings"
                        onPress={() => {
                            Alert.alert(
                                'Reset Security',
                                'This will remove your PIN, Pattern, and Biometric lock settings. Are you sure?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Reset All', style: 'destructive', onPress: async () => {
                                        await clearAllSecurityData();
                                        Alert.alert('Security Reset', 'All security locks and biometric data have been cleared.');
                                    }}
                                ]
                            );
                        }}
                        right={<MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />}
                    />
                </View>

                {/* ── Recovery ─────────────────────────────────────────── */}
                <SectionHeader title="Account Recovery" icon="email-check" />
                <View style={styles.card}>
                    <View style={styles.infoBox}>
                        <View style={styles.infoIcon}>
                            <MaterialCommunityIcons name="email-outline" size={24} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>Recovery Email</Text>
                            <Text style={styles.infoValue}>{user?.email || authUser?.email || 'No email set'}</Text>
                        </View>
                    </View>
                </View>
                <Text style={styles.hint}>
                    This email is used to send recovery codes if you forget your App Lock PIN or Pattern.
                </Text>
                <TouchableOpacity 
                    style={styles.recoveryBtn} 
                    onPress={() => router.push('/settings/reset-app-lock' as any)}
                >
                    <MaterialCommunityIcons name="lock-reset" size={16} color="#8B5CF6" />
                    <Text style={styles.recoveryText}>Forgot App Lock Secret?</Text>
                </TouchableOpacity>

                {/* ── Privacy ──────────────────────────────────────────── */}
                <SectionHeader title="Privacy" icon="eye-off" />
                <View style={styles.card}>
                    <SettingRow
                        icon="shield-check"
                        iconBg="#166534"
                        label="Privacy & Safety"
                        onPress={() => Alert.alert(
                            'Privacy & Safety',
                            'Your data is encrypted end-to-end. We never sell or share your personal information with third parties.\n\nYou may delete your data at any time from the "Delete Account" option.'
                        )}
                        right={<MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />}
                    />
                    <SettingRow
                        icon="help-circle-outline"
                        iconBg="#374151"
                        label="Help Center"
                        onPress={() => Alert.alert('Help Center', 'For support, contact:\nsupport@loveableapp.com')}
                        right={<MaterialCommunityIcons name="chevron-right" size={20} color="#475569" />}
                    />
                </View>

                {/* ── Danger zone ───────────────────────────────────────── */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="logout" size={20} color="#FFF" />
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: '#1E293B',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
    savingText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },

    content: { padding: 20, paddingBottom: 60 },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: 28, marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: 0.8,
    },

    card: {
        backgroundColor: '#0F172A', borderRadius: 18,
        borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden',
    },
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#1E293B',
        gap: 14,
    },
    rowIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { flex: 1, color: '#E2E8F0', fontSize: 15, fontWeight: '500' },
    rowRight: { alignItems: 'center', justifyContent: 'center' },

    valuePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(139,92,246,0.12)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    },
    valuePillText: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },

    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8, marginHorizontal: 16 },
    hint: { color: '#475569', fontSize: 12, marginTop: 8, paddingLeft: 4, lineHeight: 18 },
    
    infoBox: {
        flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16,
    },
    infoIcon: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(139,92,246,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    infoLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },

    logoutSection: { marginTop: 40, alignItems: 'center' },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#EF4444', borderRadius: 16,
        paddingVertical: 16, paddingHorizontal: 48,
        shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    logoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    recoveryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 12, gap: 6, paddingVertical: 8,
    },
    recoveryText: { color: '#8B5CF6', fontSize: 13, fontWeight: '700' },
});
