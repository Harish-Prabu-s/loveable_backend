import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';

interface Coin {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  value: number;
  active: boolean;
}

export default function CarromBoard({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(10);

  // Game Board size
  const BOARD_SIZE = 300;

  // Using pure state for rendering UI elements
  // We'll update this state from a requestAnimationFrame loop manually.
  const [strikerPos, setStrikerPos] = useState({ x: 150, y: 250 });
  const [coinsData, setCoinsData] = useState<Coin[]>([]);
  const [dragLine, setDragLine] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

  // Mutable refs for high speed physics loops to avoid closure hell
  const strikerRef = useRef({ x: 150, y: 250, vx: 0, vy: 0, r: 12, isMoving: false });
  const coinsRef = useRef<Coin[]>([]);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragCurrentRef = useRef({ x: 0, y: 0 });
  const reqRef = useRef<number | undefined>(undefined);
  const scoreRef = useRef(0);
  const shotsRef = useRef(10);

  // Init Coins
  useEffect(() => {
    const initialCoins: Coin[] = [];
    initialCoins.push({ id: 'queen', x: 150, y: 150, vx: 0, vy: 0, r: 10, color: '#EF4444', value: 50, active: true });
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      initialCoins.push({
        id: `coin-${i}`,
        x: 150 + 25 * Math.cos(angle),
        y: 150 + 25 * Math.sin(angle),
        vx: 0, vy: 0, r: 8,
        color: i % 2 === 0 ? '#FFFFFF' : '#1F2937',
        value: i % 2 === 0 ? 20 : 10,
        active: true
      });
    }
    coinsRef.current = initialCoins;
    setCoinsData(initialCoins);
  }, []);

  useEffect(() => {
    let isActive = true;

    const updatePhysics = () => {
      let needsRender = false;
      const friction = 0.98;
      const boundary = BOARD_SIZE;

      const s = strikerRef.current;
      if (s.isMoving) {
        needsRender = true;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= friction;
        s.vy *= friction;

        if (s.x < s.r || s.x > boundary - s.r) s.vx *= -1;
        if (s.y < s.r || s.y > boundary - s.r) s.vy *= -1;

        if (Math.abs(s.vx) < 0.1 && Math.abs(s.vy) < 0.1) {
          s.vx = 0; s.vy = 0; s.isMoving = false;
          if (s.y < 200) {
            s.y = 250;
            s.x = 150;
          }
        }
      }

      let activeCoinsChanged = false;

      coinsRef.current.forEach(c => {
        if (!c.active) return;

        if (Math.abs(c.vx) > 0.1 || Math.abs(c.vy) > 0.1 || s.isMoving) {
          needsRender = true;
        }

        c.x += c.vx;
        c.y += c.vy;
        c.vx *= friction;
        c.vy *= friction;

        if (Math.abs(c.vx) < 0.05) c.vx = 0;
        if (Math.abs(c.vy) < 0.05) c.vy = 0;

        // Bounce Walls
        if (c.x < c.r || c.x > boundary - c.r) c.vx *= -1;
        if (c.y < c.r || c.y > boundary - c.r) c.vy *= -1;

        // Collision with Striker
        const dx = c.x - s.x;
        const dy = c.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < c.r + s.r) {
          const angle = Math.atan2(dy, dx);
          const force = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
          c.vx += Math.cos(angle) * force * 1.2;
          c.vy += Math.sin(angle) * force * 1.2;
          s.vx *= -0.5;
          s.vy *= -0.5;
        }

        // Pockets
        const pocketR = 25;
        if ((c.x < pocketR && c.y < pocketR) || (c.x > boundary - pocketR && c.y < pocketR) ||
          (c.x < pocketR && c.y > boundary - pocketR) || (c.x > boundary - pocketR && c.y > boundary - pocketR)) {
          c.active = false;
          activeCoinsChanged = true;
          scoreRef.current += c.value;
          setScore(scoreRef.current);
          if (scoreRef.current >= 100) {
            setTimeout(() => onGameOver('me'), 500);
          }
        }
      });

      if (needsRender || activeCoinsChanged) {
        // Clone arrays to force React re-render of exact positions
        setCoinsData(coinsRef.current.map(c => ({ ...c })));
        setStrikerPos({ x: s.x, y: s.y });
      }

      // Update drag line if dragging
      if (isDraggingRef.current) {
        setDragLine({
          x1: s.x,
          y1: s.y,
          x2: s.x + (dragStartRef.current.x - dragCurrentRef.current.x),
          y2: s.y + (dragStartRef.current.y - dragCurrentRef.current.y)
        });
      } else if (dragLine !== null) {
        setDragLine(null);
      }
    };

    const loop = () => {
      if (!isActive) return;
      updatePhysics();
      reqRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      isActive = false;
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [onGameOver, dragLine]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (strikerRef.current.isMoving) return;
        const x = evt.nativeEvent.locationX;
        const y = evt.nativeEvent.locationY;

        const dx = x - strikerRef.current.x;
        const dy = y - strikerRef.current.y;
        if (dx * dx + dy * dy < 900) {
          isDraggingRef.current = true;
          dragStartRef.current = { x, y };
          dragCurrentRef.current = { x, y };
        } else if (y > 230 && y < 270) {
          // Move striker on baseline
          strikerRef.current.x = Math.max(20, Math.min(280, x));
          setStrikerPos({ x: strikerRef.current.x, y: strikerRef.current.y });
        }
      },
      onPanResponderMove: (evt) => {
        if (!isDraggingRef.current) return;
        dragCurrentRef.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY
        };
      },
      onPanResponderRelease: () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        const dx = dragStartRef.current.x - dragCurrentRef.current.x;
        const dy = dragStartRef.current.y - dragCurrentRef.current.y;

        strikerRef.current.vx = dx * 0.15;
        strikerRef.current.vy = dy * 0.15;
        strikerRef.current.isMoving = true;

        shotsRef.current -= 1;
        setShots(shotsRef.current);
        if (shotsRef.current <= 0 && scoreRef.current < 50) {
          setTimeout(() => onGameOver('opponent'), 1000);
        }
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
      }
    })
  ).current;

  // Compute length and angle for drag line
  const dragLen = dragLine ? Math.sqrt(Math.pow(dragLine.x2 - dragLine.x1, 2) + Math.pow(dragLine.y2 - dragLine.y1, 2)) : 0;
  const dragAngle = dragLine ? Math.atan2(dragLine.y2 - dragLine.y1, dragLine.x2 - dragLine.x1) * 180 / Math.PI : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.statsText}>Score: {score}</Text>
        <Text style={styles.statsText}>Shots: {shots}</Text>
      </View>

      <View
        style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}
        {...panResponder.panHandlers}
      >
        {/* Pockets */}
        <View style={[styles.pocket, { top: -10, left: -10 }]} />
        <View style={[styles.pocket, { top: -10, right: -10 }]} />
        <View style={[styles.pocket, { bottom: -10, left: -10 }]} />
        <View style={[styles.pocket, { bottom: -10, right: -10 }]} />

        {/* Baseline */}
        <View style={styles.baseline} />

        {/* Coins */}
        {coinsData.filter(c => c.active).map(c => (
          <View
            key={c.id}
            style={[
              styles.coin,
              {
                width: c.r * 2,
                height: c.r * 2,
                borderRadius: c.r,
                backgroundColor: c.color,
                transform: [{ translateX: c.x - c.r }, { translateY: c.y - c.r }]
              }
            ]}
          />
        ))}

        {/* Striker */}
        <View
          style={[
            styles.striker,
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              transform: [{ translateX: strikerPos.x - 12 }, { translateY: strikerPos.y - 12 }]
            }
          ]}
        />

        {/* Drag Line (using View transform) */}
        {dragLine && (
          <View
            style={[
              styles.dragLine,
              {
                width: dragLen,
                transform: [
                  { translateX: dragLine.x1 },
                  { translateY: dragLine.y1 },
                  { rotate: `${dragAngle}deg` }
                ]
              }
            ]}
          />
        )}
      </View>

      <Text style={styles.instruction}>Drag Striker to aim. Pull back to shoot.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statsText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 16,
  },
  board: {
    backgroundColor: '#FCE7F3',
    borderRadius: 24,
    borderWidth: 8,
    borderColor: '#831843', // Dark pink border
    overflow: 'hidden',
    position: 'relative',
  },
  pocket: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  baseline: {
    position: 'absolute',
    top: 250,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: '#DB2777',
  },
  coin: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  striker: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#EC4899',
    borderWidth: 2,
    borderColor: '#831843',
  },
  dragLine: {
    position: 'absolute',
    top: 0, left: 0, // Pivot at 0,0 via transform origin mapping implicitly if translated
    height: 2,
    backgroundColor: '#EF4444',
    borderStyle: 'dashed',
    // We adjust origin to top left manually by offsetting translation or using transform origin (RN 0.73+ supports transformOrigin, but let's be safe with default center origin offset)
    transformOrigin: '0 0',
  },
  instruction: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 12,
  }
});
