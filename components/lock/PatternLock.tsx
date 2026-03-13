import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PatternLockProps {
  onComplete: (pattern: number[]) => void;
  title?: string;
  error?: boolean;
  onBack?: () => void;
}

export default function PatternLock({
  onComplete,
  title = "Draw Pattern",
  error = false,
  onBack
}: PatternLockProps) {
  const [pattern, setPattern] = useState<number[]>([]);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Create 3x3 grid dots
  const DOTS = 9;
  const gridWidth = 280;
  const dotSize = 20;

  // Layout logic 
  const gap = gridWidth / 3;
  const offset = gap / 2;

  const getDotCoords = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      x: col * gap + offset,
      y: row * gap + offset
    };
  };

  const dots = Array.from({ length: DOTS }).map((_, i) => getDotCoords(i));
  const hitboxRadius = 30;

  const getTouchedDotIndex = (x: number, y: number) => {
    for (let i = 0; i < DOTS; i++) {
      const dot = dots[i];
      const dist = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
      if (dist <= hitboxRadius) return i;
    }
    return -1;
  };

  const handlePointerStart = (x: number, y: number) => {
    setIsDragging(true);
    setCurrentPos({ x, y });
    const idx = getTouchedDotIndex(x, y);
    if (idx !== -1) {
      setPattern([idx]);
    } else {
      setPattern([]);
    }
  };

  const handlePointerMove = (x: number, y: number) => {
    if (!isDragging) return;
    setCurrentPos({ x, y });

    const idx = getTouchedDotIndex(x, y);
    if (idx !== -1 && !pattern.includes(idx)) {
      setPattern(prev => [...prev, idx]);
    }
  };

  const handlePointerRelease = () => {
    setIsDragging(false);
    if (pattern.length >= 4) {
      onComplete(pattern);
      setTimeout(() => setPattern([]), 500);
    } else if (pattern.length > 0) {
      setPattern([]); // Too short, clear immediately
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handlePointerStart(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        handlePointerMove(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        handlePointerRelease();
      },
      onPanResponderTerminate: () => {
        handlePointerRelease();
      }
    })
  ).current;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={[styles.gridContainer, { width: gridWidth, height: gridWidth }]} {...panResponder.panHandlers}>
        {/* Draw Lines */}
        <Svg height={gridWidth} width={gridWidth} style={StyleSheet.absoluteFill}>
          {pattern.map((dotIndex, i) => {
            if (i === pattern.length - 1) return null;
            const start = getDotCoords(dotIndex);
            const end = getDotCoords(pattern[i + 1]);
            return (
              <Line
                key={`line-${i}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={error ? '#EF4444' : '#8B5CF6'}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}

          {/* Current Drag Line */}
          {isDragging && pattern.length > 0 && (
            <Line
              x1={getDotCoords(pattern[pattern.length - 1]).x}
              y1={getDotCoords(pattern[pattern.length - 1]).y}
              x2={currentPos.x}
              y2={currentPos.y}
              stroke={error ? '#EF4444' : '#8B5CF6'}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.5"
            />
          )}
        </Svg>

        {/* Draw Dots */}
        {dots.map((coords, i) => {
          const isActive = pattern.includes(i);
          return (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                { left: coords.x - dotSize / 2, top: coords.y - dotSize / 2 },
                isActive && (error ? styles.dotError : styles.dotActive)
              ]}
              pointerEvents="none"
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.actionBtn}>
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setPattern([])} style={styles.actionBtn}>
          <MaterialCommunityIcons name="refresh" size={16} color="#64748B" />
          <Text style={styles.actionText}>Reset</Text>
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
  gridContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  dot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    backgroundColor: '#8B5CF6',
    transform: [{ scale: 1.3 }],
  },
  dotError: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.3 }],
  },
  footer: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 40,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  }
});
