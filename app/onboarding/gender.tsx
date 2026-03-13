import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { MotiView } from 'moti';

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male', icon: 'account' as const, color: '#3B82F6' },
  { value: 'F', label: 'Female', icon: 'account-heart' as const, color: '#EC4899' },
  { value: 'O', label: 'Other', icon: 'account-star' as const, color: '#8B5CF6' },
];

export default function GenderScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading] = useState(false);
  const { dispatch } = useAuth();

  const handleContinue = () => {
    if (!selected) {
      Alert.alert('Selection Required', 'Please select your gender.');
      return;
    }
    dispatch({ type: 'SET_ONBOARDING_DATA', payload: { gender: selected } });
    console.log('[Onboarding] Gender saved. Navigating to Language...');
    router.replace('/onboarding/language');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {/* Progress */}
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 100 }}>
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={[styles.progressDot, n === 2 && styles.progressDotActive]} />
            ))}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: -10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring' }}
        >
          <Text style={styles.title}>Select Your Gender</Text>
          <Text style={styles.subtitle}>Helps us find the right connections for you</Text>
        </MotiView>

        <View style={styles.options}>
          {GENDER_OPTIONS.map((opt, index) => {
            const isSelected = selected === opt.value;
            return (
              <MotiView
                key={opt.value}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: 300 + index * 100 }}
              >
                <TouchableOpacity
                  style={[
                    styles.card,
                    isSelected && { borderColor: opt.color, backgroundColor: opt.color + '1A' },
                  ]}
                  onPress={() => setSelected(opt.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconContainer, { backgroundColor: opt.color }]}>
                    <MaterialCommunityIcons name={opt.icon} size={32} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.cardLabel, isSelected && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <MotiView from={{ scale: 0 }} animate={{ scale: 1 }}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color={opt.color}
                        style={styles.check}
                      />
                    </MotiView>
                  )}
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>

        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 700 }}>
          <TouchableOpacity
            style={[styles.button, (!selected || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selected || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </MotiView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E293B' },
  progressDotActive: { backgroundColor: '#8B5CF6', width: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
    lineHeight: 22,
  },
  options: { gap: 16 },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardLabel: { fontSize: 18, fontWeight: '600', color: '#F8FAFC', flex: 1 },
  check: { marginLeft: 'auto' },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 36,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.45, elevation: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
