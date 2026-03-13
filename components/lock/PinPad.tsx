import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PinPadProps {
  length?: number;
  onComplete: (pin: string) => void;
  title?: string;
  error?: boolean;
  onBack?: () => void;
}

export default function PinPad({
  length = 4,
  onComplete,
  title = "Enter PIN",
  error = false,
  onBack
}: PinPadProps) {
  const [pin, setPin] = useState("");
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleNumberClick = (num: number) => {
    if (pin.length < length) {
      const newPin = pin + num;
      setPin(newPin);
      Vibration.vibrate(10);

      if (newPin.length === length) {
        setTimeout(() => {
          onComplete(newPin);
          setPin("");
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    Vibration.vibrate(10);
  };

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
      ]).start(() => setPin(""));
    }
  }, [error, shakeAnim]);

  return (
    <View style={styles.container}>
      {!!title && <Text style={styles.title}>{title}</Text>}

      {/* Dots display */}
      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? styles.dotFilled : styles.dotEmpty,
              error && styles.dotError
            ]}
          />
        ))}
      </Animated.View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.keyBtn}
            onPress={() => handleNumberClick(num)}
            activeOpacity={0.6}
          >
            <Text style={styles.keyText}>{num}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.emptyKeyCell}>
          {onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.6}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.keyBtn}
          onPress={() => handleNumberClick(0)}
          activeOpacity={0.6}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keyBtnEmpty}
          onPress={handleDelete}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="backspace-outline" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotFilled: {
    backgroundColor: '#8B5CF6',
    transform: [{ scale: 1.1 }],
  },
  dotEmpty: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dotError: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  keyBtn: {
    width: '33.33%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyBtnEmpty: {
    width: '33.33%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#334155',
  },
  emptyKeyCell: {
    width: '33.33%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  }
});
