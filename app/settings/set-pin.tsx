import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Alert, Vibration,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsApi } from '@/api/notifications';
import { useSecurityStore } from '@/store/securityStore';

const PIN_LENGTH = 4;

export default function SetPinScreen() {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'enter' | 'confirm'>('enter');
    const { setPin: setStorePin } = useSecurityStore();

    const handleDigit = (digit: string) => {
        if (step === 'enter') {
            const next = pin + digit;
            setPin(next);
            if (next.length === PIN_LENGTH) {
                setTimeout(() => setStep('confirm'), 200);
            }
        } else {
            const next = confirmPin + digit;
            setConfirmPin(next);
            if (next.length === PIN_LENGTH) {
                setTimeout(() => finalize(pin, next), 200);
            }
        }
    };

    const handleDelete = () => {
        if (step === 'enter') {
            setPin(p => p.slice(0, -1));
        } else {
            setConfirmPin(p => p.slice(0, -1));
        }
    };

    const finalize = async (p1: string, p2: string) => {
        if (p1 !== p2) {
            Vibration.vibrate(200);
            Alert.alert('Mismatch', 'PINs do not match. Try again.');
            setPin('');
            setConfirmPin('');
            setStep('enter');
            return;
        }
        try {
            await setStorePin(p1);
            await notificationsApi.updateSettings({ app_lock_type: 'pin' } as any);
            Alert.alert('✓ PIN Set', 'App lock PIN has been saved.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch {
            Alert.alert('Error', 'Could not save PIN. Try again.');
            setPin(''); setConfirmPin(''); setStep('enter');
        }
    };

    const currentValue = step === 'enter' ? pin : confirmPin;

    const pad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.title}>Set PIN Lock</Text>
            </View>

            <View style={styles.body}>
                <MaterialCommunityIcons name="lock" size={48} color="#8B5CF6" style={{ marginBottom: 16 }} />
                <Text style={styles.stepLabel}>
                    {step === 'enter' ? 'Enter a 4-digit PIN' : 'Confirm your PIN'}
                </Text>

                {/* Dot indicators */}
                <View style={styles.dotsRow}>
                    {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, { backgroundColor: i < currentValue.length ? '#8B5CF6' : '#1E293B' }]}
                        />
                    ))}
                </View>

                {/* Numpad */}
                <View style={styles.pad}>
                    {pad.map((k, i) => {
                        if (k === '') return <View key={i} style={styles.padCell} />;
                        return (
                            <TouchableOpacity
                                key={i}
                                style={styles.padCell}
                                onPress={() => k === 'del' ? handleDelete() : handleDigit(k)}
                                disabled={k !== 'del' && currentValue.length >= PIN_LENGTH}
                            >
                                {k === 'del' ? (
                                    <MaterialCommunityIcons name="backspace-outline" size={24} color="#94A3B8" />
                                ) : (
                                    <Text style={styles.padDigit}>{k}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#1E293B',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    title: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    stepLabel: { fontSize: 18, fontWeight: '600', color: '#E2E8F0', marginBottom: 32, textAlign: 'center' },
    dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 48 },
    dot: { width: 18, height: 18, borderRadius: 9 },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, gap: 12, justifyContent: 'center' },
    padCell: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B',
        alignItems: 'center', justifyContent: 'center',
    },
    padDigit: { fontSize: 28, fontWeight: '600', color: '#F1F5F9' },
});
