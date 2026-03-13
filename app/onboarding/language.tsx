import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { MotiView } from 'moti';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', flag: '🇮🇳' },
];

export default function LanguageScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const { dispatch } = useAuth();

  const handleContinue = () => {
    if (!selected) {
      Alert.alert('Selection Required', 'Please choose your preferred language.');
      return;
    }
    dispatch({ type: 'SET_ONBOARDING_DATA', payload: { language: selected } });
    console.log('[Onboarding] Language saved. Navigating to Details...');
    router.replace('/onboarding/details');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Progress */}
      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 100 }}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[styles.progressDot, n === 3 && styles.progressDotActive]} />
          ))}
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: -10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring' }}
        style={styles.header}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="translate" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Preferred Language</Text>
        <Text style={styles.subtitle}>We'll connect you with native speakers</Text>
      </MotiView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <View style={styles.grid}>
          {LANGUAGES.map((lang, index) => {
            const isSelected = selected === lang.code;
            return (
              <MotiView
                key={lang.code}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: 300 + index * 50 }}
              >
                <TouchableOpacity
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => setSelected(lang.code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                    {lang.label}
                  </Text>
                  {isSelected && (
                    <MotiView from={{ scale: 0 }} animate={{ scale: 1 }}>
                      <MaterialCommunityIcons name="check-circle" size={22} color="#8B5CF6" />
                    </MotiView>
                  )}
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </View>
      </ScrollView>

      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 800 }}>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !selected && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 16,
    marginBottom: 8,
  },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E293B' },
  progressDotActive: { backgroundColor: '#8B5CF6', width: 24 },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 6,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 6, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 8 },
  grid: { gap: 10 },
  item: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  itemSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  flag: { fontSize: 22 },
  itemText: { fontSize: 16, color: '#CBD5E1', flex: 1 },
  itemTextSelected: { fontWeight: '700', color: '#8B5CF6' },
  footer: { padding: 24 },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.45, elevation: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
