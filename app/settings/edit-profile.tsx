import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import { useSecurityStore } from '@/store/securityStore';
import { toast } from '@/utils/toast';

export default function EditProfileScreen() {
    const { user, updateProfile, uploadAvatar, isLoading } = useAuthStore();
    const { setBypassLock } = useSecurityStore();

    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarUri, setAvatarUri] = useState<string | null>(user?.photo || null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Bio from store might be more up-to-date
        if (user?.bio) setBio(user.bio);
    }, [user]);

    const handlePickAvatar = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                toast.error('Please allow access to your photo library.');
                return;
            }

            setBypassLock(true);
            let result;
            try {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                });
            } finally {
                setTimeout(() => setBypassLock(false), 1000);
            }

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setAvatarUri(uri);
                // Perform upload immediately
                await uploadAvatar(uri);
                toast.success('Profile photo updated!');
            }
        } catch (e) {
            console.error('Pick avatar error:', e);
            toast.error('Failed to upload photo. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!displayName.trim()) {
            toast.error('Display name cannot be empty.');
            return;
        }

        setSaving(true);
        try {
            await updateProfile({
                display_name: displayName.trim(),
                username: username.trim(),
                bio: bio.trim(),
            });
            toast.success('Profile updated successfully!');
            router.back();
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e?.message || 'Failed to save profile.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || isLoading}
                    style={styles.saveButton}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#8B5CF6" />
                    ) : (
                        <Text style={styles.saveText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : (
                            <LinearGradient
                                colors={['#EC4899', '#8B5CF6']}
                                style={styles.avatarPlaceholder}
                            >
                                <MaterialCommunityIcons name="account" size={48} color="#FFFFFF" />
                            </LinearGradient>
                        )}
                        <View style={styles.cameraOverlay}>
                            <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.avatarHint}>Tap to change photo</Text>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Your display name"
                            placeholderTextColor="#475569"
                            maxLength={50}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputWithPrefix}>
                            <Text style={styles.inputPrefix}>@</Text>
                            <TextInput
                                style={[styles.input, styles.inputUsername]}
                                value={username}
                                onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
                                placeholder="username"
                                placeholderTextColor="#475569"
                                autoCapitalize="none"
                                maxLength={30}
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.inputBio]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell people about yourself..."
                            placeholderTextColor="#475569"
                            multiline
                            numberOfLines={4}
                            maxLength={200}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{bio.length}/200</Text>
                    </View>

                    {/* Non-editable info */}
                    <View style={styles.readOnlySection}>
                        <Text style={styles.readOnlyTitle}>Account Info</Text>
                        <View style={styles.readOnlyRow}>
                            <MaterialCommunityIcons name="phone" size={18} color="#64748B" />
                            <Text style={styles.readOnlyText}>{user?.phone_number || '—'}</Text>
                        </View>
                        <View style={styles.readOnlyRow}>
                            <MaterialCommunityIcons name="email-outline" size={18} color="#64748B" />
                            <Text style={styles.readOnlyText}>{user?.email || '—'}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#0F172A',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 1,
        borderColor: '#8B5CF6',
        minWidth: 60,
        alignItems: 'center',
    },
    saveText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#8B5CF6',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#020617',
    },
    avatarHint: {
        marginTop: 12,
        fontSize: 13,
        color: '#64748B',
    },
    form: {
        paddingHorizontal: 24,
        gap: 24,
    },
    fieldGroup: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#F1F5F9',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    inputWithPrefix: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E293B',
        paddingHorizontal: 16,
    },
    inputPrefix: {
        fontSize: 16,
        color: '#64748B',
        marginRight: 4,
    },
    inputUsername: {
        flex: 1,
        borderWidth: 0,
        paddingHorizontal: 0,
        backgroundColor: 'transparent',
    },
    inputBio: {
        height: 100,
        paddingTop: 14,
    },
    charCount: {
        fontSize: 12,
        color: '#475569',
        textAlign: 'right',
    },
    readOnlySection: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    readOnlyTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    readOnlyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    readOnlyText: {
        fontSize: 15,
        color: '#94A3B8',
    },
});
