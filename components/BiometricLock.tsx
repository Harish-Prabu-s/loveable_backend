import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import PinPad from './lock/PinPad';
import PatternLock from './lock/PatternLock';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { storage } from '@/lib/storage';

interface BiometricLockProps {
  children: React.ReactNode;
}

type LockMethod = 'biometric' | 'pin' | 'pattern';

export default function BiometricLock({ children }: BiometricLockProps) {
  const { user } = useAuthStore();
  const [isLocked, setIsLocked] = useState(false);
  const [activeMethod, setActiveMethod] = useState<LockMethod>('biometric');
  const [error, setError] = useState(false);

  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [savedPattern, setSavedPattern] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // Reset State
  const [isResetting, setIsResetting] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      if (!user?.id) return;

      const lockEnabled = await storage.getItem(`user_${user.id}_app_lock_enabled`) === 'true';
      const pin = await storage.getItem(`user_${user.id}_app_lock_pin`);
      const pattern = await storage.getItem(`user_${user.id}_app_lock_pattern`);
      const bio = await storage.getItem(`user_${user.id}_app_lock_biometric`) !== 'false';
      const method = await storage.getItem(`user_${user.id}_app_lock_method`) as LockMethod || 'biometric';

      setSavedPin(pin);
      setSavedPattern(pattern);
      setBiometricEnabled(bio);

      if (lockEnabled) {
        setIsLocked(true);
        if (bio) setActiveMethod('biometric');
        else if (method === 'pattern' && pattern) setActiveMethod('pattern');
        else if (pin) setActiveMethod('pin');
        else setActiveMethod('biometric');
      } else {
        setIsLocked(false);
      }
    };

    loadState();
  }, [user?.id]);

  const handleBiometricUnlock = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Notice', 'Biometrics not available or not set up on this device');
        return;
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        fallbackLabel: 'Use PIN/Pattern',
      });

      if (res.success) {
        setIsLocked(false);
      } else {
        setError(true);
        setTimeout(() => setError(false), 500);
      }
    } catch (e) {
      Alert.alert('Error', 'Biometric authentication failed');
    }
  };

  const handlePinSubmit = (pin: string) => {
    if (pin === savedPin) {
      setIsLocked(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const handlePatternSubmit = (pattern: number[]) => {
    if (JSON.stringify(pattern) === savedPattern) {
      setIsLocked(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const handleSendResetOtp = async () => {
    if (!user?.phone_number) {
      Alert.alert('Error', 'No phone number found to send OTP');
      return;
    }

    try {
      await authApi.sendOTP({ phone_number: user.phone_number });
      setIsResetting(true);
      Alert.alert('Notice', `OTP sent to ${user.phone_number}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!resetOtp || resetOtp.length < 4) {
      Alert.alert('Error', 'Please enter valid OTP');
      return;
    }

    if (!user?.phone_number) return;

    setIsVerifyingOtp(true);
    try {
      await authApi.verifyOTP({
        phone_number: user.phone_number,
        otp_code: resetOtp
      });

      if (user?.id) {
        await storage.removeItem(`user_${user.id}_app_lock_enabled`);
        await storage.removeItem(`user_${user.id}_app_lock_pin`);
        await storage.removeItem(`user_${user.id}_app_lock_pattern`);
        await storage.removeItem(`user_${user.id}_app_lock_method`);
        await storage.removeItem(`user_${user.id}_app_lock_biometric`);
      }

      setIsLocked(false);
      setIsResetting(false);
      Alert.alert('Success', 'App Lock Reset Successfully');
    } catch (err) {
      Alert.alert('Error', 'Invalid OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <Modal visible={isLocked} animationType="fade" style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {isResetting ? (
          <View style={styles.resetContainer}>
            <View style={styles.resetIconBox}>
              <MaterialCommunityIcons name="refresh" size={32} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Reset App Lock</Text>
            <Text style={styles.subtitle}>
              Enter the OTP sent to{'\n'}
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>{user?.phone_number}</Text>
            </Text>

            <TextInput
              style={styles.otpInput}
              value={resetOtp}
              onChangeText={setResetOtp}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerifyResetOtp}
              disabled={isVerifyingOtp}
            >
              {isVerifyingOtp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.verifyBtnText}>Reset Lock</Text>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsResetting(false); setResetOtp(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lockContainer}>
            <View style={styles.header}>
              <View style={styles.lockIconBox}>
                <MaterialCommunityIcons name="lock" size={40} color="#8B5CF6" />
              </View>
              <Text style={styles.title}>App Locked</Text>
              <Text style={styles.subtitle}>
                {activeMethod === 'biometric' && "Verify identity to continue"}
                {activeMethod === 'pin' && "Enter your PIN"}
                {activeMethod === 'pattern' && "Draw your Pattern"}
              </Text>
            </View>

            <View style={styles.mainContent}>
              {activeMethod === 'biometric' && (
                <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricUnlock}>
                  <MaterialCommunityIcons name="fingerprint" size={64} color={error ? "#EF4444" : "#8B5CF6"} />
                  <Text style={[styles.biometricText, error && { color: "#EF4444" }]}>
                    Tap to Scan
                  </Text>
                </TouchableOpacity>
              )}

              {activeMethod === 'pin' && (
                <PinPad onComplete={handlePinSubmit} error={error} title="" />
              )}

              {activeMethod === 'pattern' && (
                <PatternLock onComplete={handlePatternSubmit} error={error} title="" />
              )}
            </View>

            <View style={styles.footer}>
              <View style={styles.switcher}>
                {biometricEnabled && activeMethod !== 'biometric' && (
                  <TouchableOpacity style={styles.switchBtn} onPress={() => setActiveMethod('biometric')}>
                    <View style={styles.switchIconBox}>
                      <MaterialCommunityIcons name="fingerprint" size={20} color="#64748B" />
                    </View>
                    <Text style={styles.switchText}>Biometric</Text>
                  </TouchableOpacity>
                )}

                {savedPin && activeMethod !== 'pin' && (
                  <TouchableOpacity style={styles.switchBtn} onPress={() => setActiveMethod('pin')}>
                    <View style={styles.switchIconBox}>
                      <MaterialCommunityIcons name="dialpad" size={20} color="#64748B" />
                    </View>
                    <Text style={styles.switchText}>PIN</Text>
                  </TouchableOpacity>
                )}

                {savedPattern && activeMethod !== 'pattern' && (
                  <TouchableOpacity style={styles.switchBtn} onPress={() => setActiveMethod('pattern')}>
                    <View style={styles.switchIconBox}>
                      <MaterialCommunityIcons name="grid" size={20} color="#64748B" />
                    </View>
                    <Text style={styles.switchText}>Pattern</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.forgotBtn} onPress={handleSendResetOtp}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
                <Text style={styles.forgotSubText}> (Reset via OTP)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 16,
  },
  resetContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  resetIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  otpInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    marginBottom: 32,
    color: '#0F172A',
  },
  verifyBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 16,
    padding: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
  },
  lockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricBtn: {
    padding: 40,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  biometricText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  footer: {
    alignItems: 'center',
    gap: 32,
  },
  switcher: {
    flexDirection: 'row',
    gap: 24,
  },
  switchBtn: {
    alignItems: 'center',
    gap: 8,
  },
  switchIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  forgotSubText: {
    fontSize: 12,
    color: '#CBD5E1',
  }
});
