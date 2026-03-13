import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import type { User, AuthResponse } from '@/types';
import { MotiView } from 'moti';

export default function DetailsScreen() {
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { onboardingData, tempToken, dispatch, login } = useAuth();
    const { setCredentials } = useAuthStore();

    const isValid = name.trim().length >= 2;

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!isValid) {
            Alert.alert('Name Required', 'Please enter at least 2 characters for your name.');
            return;
        }

        try {
            console.log(`[Details] Completing profile for ${name.trim()}...`);
            const resp = await authApi.completeProfile({
                email: onboardingData.email,
                gender: onboardingData.gender,
                languages: [onboardingData.language],
                name: name.trim(),
                bio: bio.trim(),
            });

            console.log('[Details] CompleteProfile Response:', JSON.stringify(resp));

            // Standardize token retrieval
            const token = resp.access || resp.access_token || resp.token || tempToken;
            const refreshToken = resp.refresh || resp.refresh_token || '';

            // Construct user object robustly (handling both nested and flat responses)
            const r = resp as any;
            const user: User = resp.user || {
                id: r.id || 0,
                phone_number: r.phone_number || onboardingData.email || '', // Fallback to email if phone missing
                display_name: r.display_name || name.trim(),
                email: r.email || onboardingData.email || '',
                gender: r.gender || onboardingData.gender || null,
                is_verified: r.is_verified ?? true,
                is_online: r.is_online ?? true,
                date_joined: r.date_joined || new Date().toISOString(),
                last_login: r.last_login || new Date().toISOString(),
                photo: r.photo || null,
                bio: r.bio || bio.trim(),
            };

            if (!token || !user.id) {
                console.error('[Details] Missing token or user ID in response');
                throw new Error('Invalid server response during profile completion');
            }

            console.log('[Details] Profile completion success. Finalizing login...');

            // Unified login handles storage, context, and Zustand sync
            await login(token, user, refreshToken);

            // Optional avatar upload
            if (avatar) {
                console.log('[Details] Uploading avatar...');
                authApi.uploadAvatar(avatar).catch(err => {
                    console.warn('[Details] Avatar upload failed silently:', err);
                });
            }

            // Navigation will be handled by useProtectedRoute automatically once token is set
            // but we can also trigger it manually for immediate feedback
            console.log('[Details] Navigating to tabs...');
            router.replace('/(tabs)');

        } catch (e: any) {
            console.error('[Details] Error:', e);
            const data = e?.response?.data;
            const msg = data?.error || data?.detail || data?.message;
            Alert.alert('Error', msg || e?.message || 'Failed to complete profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Progress */}
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 100 }}>
                        <View style={styles.progressRow}>
                            {[1, 2, 3, 4].map((n) => (
                                <View key={n} style={[styles.progressDot, n === 4 && styles.progressDotActive]} />
                            ))}
                        </View>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, scale: 0.9, translateY: -20 }}
                        animate={{ opacity: 1, scale: 1, translateY: 0 }}
                        transition={{ type: 'spring' }}
                    >
                        <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.headerGradient}>
                            <MaterialCommunityIcons name="account-edit-outline" size={48} color="#FFFFFF" />
                            <Text style={styles.title}>Almost Done! 🎉</Text>
                            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
                        </LinearGradient>
                    </MotiView>

                    {/* Avatar Picker */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: 300 }}
                    >
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <MaterialCommunityIcons name="camera-plus-outline" size={32} color="#8B5CF6" />
                                    <Text style={styles.avatarText}>Add Photo</Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                    </MotiView>

                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 600, delay: 500 }}
                        style={styles.form}
                    >
                        <Text style={styles.label}>Display Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            placeholderTextColor="#4B5563"
                            value={name}
                            onChangeText={setName}
                            maxLength={50}
                        />

                        <Text style={styles.label}>
                            Bio <Text style={styles.optional}>(optional)</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            placeholder="A short bio about yourself..."
                            placeholderTextColor="#4B5563"
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>{bio.length}/200</Text>

                        <TouchableOpacity
                            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={!isValid || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Complete Profile</Text>
                                    <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#020617' },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, padding: 24, paddingBottom: 48 },
    progressRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 24,
    },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E293B' },
    progressDotActive: { backgroundColor: '#8B5CF6', width: 24 },
    headerGradient: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 28,
        elevation: 8,
    },
    title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 16 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 28,
        position: 'relative',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: '#8B5CF6',
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#0F172A',
        borderWidth: 2,
        borderColor: '#334155',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    avatarText: { fontSize: 11, color: '#8B5CF6', fontWeight: '600' },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#8B5CF6',
        borderRadius: 14,
        padding: 5,
        borderWidth: 2,
        borderColor: '#020617',
    },
    form: { gap: 10 },
    label: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginTop: 4 },
    optional: { fontWeight: '400', color: '#475569' },
    input: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#1E293B',
    },
    bioInput: {
        height: 110,
        paddingTop: 14,
    },
    charCount: { fontSize: 11, color: '#475569', textAlign: 'right' },
    button: {
        backgroundColor: '#8B5CF6',
        borderRadius: 14,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        elevation: 8,
    },
    buttonDisabled: { opacity: 0.45, elevation: 0 },
    buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
