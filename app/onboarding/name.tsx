import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth';
import type { User } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

export default function NameCapture() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { syncUser } = useAuth();
  const isValid = name.trim().length >= 2;

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert('Invalid Name', 'Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      console.log(`[Onboarding] Saving name: ${name.trim()}...`);
      const resp = await authApi.updateProfile({ display_name: name.trim() });

      if (resp.success && resp.user) {
        console.log('[Onboarding] Profile updated successfully. Syncing state...');
        await syncUser(resp.user);

        // Navigation to next step
        console.log('[Onboarding] Navigating to Email...');
        router.replace('/onboarding/email');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('[Onboarding] Failed to save name:', error);
      Alert.alert('Error', 'Failed to save your name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: -20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring' }}
        >
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            style={styles.headerGradient}
          >
            <MaterialCommunityIcons name="account-edit-outline" size={48} color="white" />
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>Let others know what to call you</Text>
          </LinearGradient>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 300 }}
          style={styles.form}
        >
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.buttonText}>Get Started</Text>
                <MaterialCommunityIcons name="rocket-launch" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </MotiView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerGradient: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
