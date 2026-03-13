import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Alert, Vibration, PanResponder, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsApi } from '@/api/notifications';

// 3×3 grid positions
const DOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const DOT_SIZE = 64;
const DOT_RADIUS = 32;
const GRID_COLS = 3;

export default function SetPatternScreen() {
    const [pattern, setPattern] = useState<number[]>([]);
    const [confirmPattern, setConfirmPattern] = useState<number[]>([]);
    const [step, setStep] = useState<'enter' | 'confirm'>('enter');
    const [touching, setTouching] = useState(false);
    const containerRef = useRef<View>(null);
    const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const getDotCenter = (index: number) => {
        const row = Math.floor(index / GRID_COLS);
        const col = index % GRID_COLS;
        const spacing = layout.width / GRID_COLS;
        return {
            x: layout.x + col * spacing + spacing / 2,
            y: layout.y + row * spacing + spacing / 2,
        };
    };

    const getHitDot = (px: number, py: number): number | null => {
        for (const i of DOTS) {
            const center = getDotCenter(i);
            const dist = Math.sqrt(Math.pow(px - center.x, 2) + Math.pow(py - center.y, 2));
            if (dist < DOT_RADIUS) return i;
        }
        return null;
    };

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
            setTouching(true);
            const dot = getHitDot(e.nativeEvent.pageX, e.nativeEvent.pageY);
            if (dot !== null) {
                if (step === 'enter') setPattern([dot]);
                else setConfirmPattern([dot]);
            }
        },
        onPanResponderMove: (e) => {
            const dot = getHitDot(e.nativeEvent.pageX, e.nativeEvent.pageY);
            if (dot === null) return;
            if (step === 'enter') {
                setPattern(prev => prev.includes(dot) ? prev : [...prev, dot]);
            } else {
                setConfirmPattern(prev => prev.includes(dot) ? prev : [...prev, dot]);
            }
        },
        onPanResponderRelease: () => {
            setTouching(false);
            const current = step === 'enter' ? pattern : confirmPattern;
            if (current.length < 4) {
                Vibration.vibrate(100);
                Alert.alert('Too short', 'Draw at least 4 dots.');
                if (step === 'enter') setPattern([]);
                else setConfirmPattern([]);
                return;
            }
            if (step === 'enter') {
                setTimeout(() => setStep('confirm'), 300);
            } else {
                finalize(pattern, confirmPattern);
            }
        },
    });

    const finalize = async (p1: number[], p2: number[]) => {
        if (p1.join(',') !== p2.join(',')) {
            Vibration.vibrate(200);
            Alert.alert('Mismatch', 'Patterns do not match. Try again.');
            setPattern([]); setConfirmPattern([]); setStep('enter');
            return;
        }
        try {
            await AsyncStorage.setItem('app_lock_pattern', p1.join(','));
            await notificationsApi.updateSettings({ app_lock_type: 'pattern' } as any);
            Alert.alert('✓ Pattern Set', 'App lock pattern has been saved.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch {
            Alert.alert('Error', 'Could not save pattern. Try again.');
            setPattern([]); setConfirmPattern([]); setStep('enter');
        }
    };

    const currentPattern = step === 'enter' ? pattern : confirmPattern;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.title}>Set Pattern Lock</Text>
            </View>

            <View style={styles.body}>
                <MaterialCommunityIcons name="gesture-tap-hold" size={48} color="#8B5CF6" style={{ marginBottom: 16 }} />
                <Text style={styles.stepLabel}>
                    {step === 'enter' ? 'Draw a pattern (min 4 dots)' : 'Confirm your pattern'}
                </Text>

                <View
                    ref={containerRef}
                    style={styles.grid}
                    onLayout={(e) => {
                        containerRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
                            setLayout({ x: px, y: py, width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
                        });
                    }}
                    {...panResponder.panHandlers}
                >
                    {DOTS.map(i => (
                        <View
                            key={i}
                            style={[
                                styles.dotWrap,
                                currentPattern.includes(i) && styles.dotActive,
                            ]}
                        >
                            <View style={[styles.innerDot, currentPattern.includes(i) && styles.innerDotActive]} />
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => { setPattern([]); setConfirmPattern([]); setStep('enter'); }}
                >
                    <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
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
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    stepLabel: { fontSize: 18, fontWeight: '600', color: '#E2E8F0', marginBottom: 40, textAlign: 'center' },
    grid: {
        width: 240, height: 240,
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'space-around', alignItems: 'center',
    },
    dotWrap: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#1E293B',
        alignItems: 'center', justifyContent: 'center', margin: 8,
    },
    dotActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.12)' },
    innerDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#334155' },
    innerDotActive: { backgroundColor: '#8B5CF6' },
    resetBtn: { marginTop: 32 },
    resetText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});
