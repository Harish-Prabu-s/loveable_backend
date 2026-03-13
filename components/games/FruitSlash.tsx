import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';

interface GameItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  type: 'fruit' | 'bomb' | 'bonus';
  emoji: string;
}

const ITEMS = [
  { type: 'fruit', emoji: '🍓' },
  { type: 'fruit', emoji: '🍒' },
  { type: 'fruit', emoji: '🍎' },
  { type: 'fruit', emoji: '🍉' },
  { type: 'bonus', emoji: '💖' },
  { type: 'bomb', emoji: '💔' },
] as const;

const { width: windowWidth } = Dimensions.get('window');

export default function FruitSlash({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [items, setItems] = useState<GameItem[]>([]);

  const requestRef = useRef<number | undefined>(undefined);
  const lastSpawnTime = useRef<number>(Date.now());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  // Use a constrained width for the spawn area (e.g. 350 max, or screen width - 40)
  const gameWidth = Math.min(windowWidth - 40, 400);
  const gameHeight = 400;

  useEffect(() => {
    let isActive = true;

    const spawnItem = (): GameItem | null => {
      const itemType = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      if (itemType.type === 'bomb' && Math.random() > 0.3) return null;

      return {
        id: Date.now() + Math.random(),
        x: Math.random() * (gameWidth - 60),
        y: gameHeight + 50,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 8 + 10), // Jump up speed
        rot: 0,
        vRot: (Math.random() - 0.5) * 10,
        type: itemType.type as any,
        emoji: itemType.emoji,
      };
    };

    const updateGame = () => {
      if (!isActive) return;

      const now = Date.now();
      if (now - lastSpawnTime.current > 800) {
        const newItem = spawnItem();
        if (newItem) {
          setItems(prev => [...prev, newItem]);
        }
        lastSpawnTime.current = now;
      }

      setItems(prev => prev.map(item => ({
        ...item,
        x: item.x + item.vx,
        y: item.y + item.vy,
        vy: item.vy + 0.2, // Gravity
        rot: item.rot + item.vRot,
      })).filter(item => item.y < gameHeight + 100));

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);

    return () => {
      isActive = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (lives <= 0) {
      onGameOver('opponent');
    }
  }, [lives, onGameOver]);

  useEffect(() => {
    if (score >= 20) {
      onGameOver('me');
    }
  }, [score, onGameOver]);

  const handleSlash = (id: number, type: string) => {
    if (type === 'bomb') {
      livesRef.current -= 1;
      setLives(livesRef.current);
    } else {
      scoreRef.current += type === 'bonus' ? 5 : 1;
      setScore(scoreRef.current);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <View style={[styles.container, { width: gameWidth, height: gameHeight }]}>
      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudBadge}>
          <Text style={styles.hudScoreText}>Score: {score}/20</Text>
        </View>
        <View style={styles.hudBadge}>
          <Text style={styles.hudLivesText}>Lives: {'❤️'.repeat(Math.max(0, lives))}</Text>
        </View>
      </View>

      {/* Game Items */}
      {items.map(item => (
        <TouchableWithoutFeedback key={item.id} onPressIn={() => handleSlash(item.id, item.type)}>
          <View
            style={[
              styles.itemWrapper,
              {
                left: item.x,
                top: item.y,
                transform: [{ rotate: `${item.rot}deg` }]
              }
            ]}
          >
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
          </View>
        </TouchableWithoutFeedback>
      ))}

      <Text style={styles.instruction}>Tap fruits to slice! Avoid heartbreak 💔</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A', // gray-900
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  hud: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  hudBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  hudScoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  hudLivesText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  itemWrapper: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 40,
  },
  instruction: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
  }
});
