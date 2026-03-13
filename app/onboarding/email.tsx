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
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { MotiView } from 'moti';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const [email, setEmail] = useState('');
  const { dispatch } = useAuth();
  const isValid = EMAIL_REGEX.test(email.trim());

  const handleContinue = () => {
    if (!isValid) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    dispatch({ type: 'SET_ONBOARDING_DATA', payload: { email: email.trim() } });
    console.log('[Onboarding] Email saved. Navigating to Gender...');
    router.replace('/onboarding/gender');
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
                <View key={n} style={[styles.progressDot, n === 1 && styles.progressDotActive]} />
              ))}
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: -20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring' }}
          >
            <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.headerGradient}>
              <MaterialCommunityIcons name="email-outline" size={48} color="#FFFFFF" />
              <Text style={styles.title}>Add Your Email</Text>
              <Text style={styles.subtitle}>For account recovery and safety</Text>
            </LinearGradient>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 300 }}
            style={styles.form}
          >
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#4B5563"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TouchableOpacity
              style={[styles.button, !isValid && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={!isValid}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Continue</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
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
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  progressDotActive: {
    backgroundColor: '#8B5CF6',
    width: 24,
  },
  headerGradient: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 16 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
  form: { gap: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
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
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.45, elevation: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
