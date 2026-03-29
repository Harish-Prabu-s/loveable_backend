import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/utils/toast';

export default function ResetPasswordScreen() {
    const { isDark } = useTheme();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            toast.error('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            // Using existing updateProfile to change password
            await authApi.updateProfile({ password });
            Alert.alert('✓ Password Updated', 'Your account login password has been changed successfully.', [
                { text: 'Great', onPress: () => router.replace('/settings' as any) }
            ]);
        } catch (error: any) {
            const msg = error?.response?.data?.detail || error?.message || 'Failed to update password.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#020617' : '#F8FAFC' }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? "#FFF" : "#000"} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: isDark ? "#FFF" : "#000" }]}>Update Password</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={[styles.card, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                    <MaterialCommunityIcons name="lock-reset" size={48} color="#8B5CF6" style={{ marginBottom: 20 }} />
                    <Text style={[styles.stepLabel, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Set New Passcode</Text>
                    
                    <View style={styles.inputWrap}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={[styles.input, { color: isDark ? '#FFF' : '#000' }]}
                            secureTextEntry
                            placeholder="Type new password"
                            placeholderTextColor="#475569"
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <View style={styles.inputWrap}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={[styles.input, { color: isDark ? '#FFF' : '#000' }]}
                            secureTextEntry
                            placeholder="Re-type password"
                            placeholderTextColor="#475569"
                            value={confirm}
                            onChangeText={setConfirm}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.mainBtn, loading && { opacity: 0.7 }]} 
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.mainBtnText}>Confirm Identity Update</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '800' },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    card: { padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
    stepLabel: { fontSize: 22, fontWeight: '800', marginBottom: 30 },
    inputWrap: { width: '100%', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    input: { width: '100%', height: 60, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.02)', paddingHorizontal: 20, fontSize: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    mainBtn: { width: '100%', height: 60, backgroundColor: '#8B5CF6', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    mainBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});
