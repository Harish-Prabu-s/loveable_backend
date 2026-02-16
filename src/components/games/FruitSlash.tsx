import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Bomb } from 'lucide-react';

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

export default function FruitSlash({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<GameItem[]>([]);
  const requestRef = useRef<number | undefined>(undefined);
  const lastSpawnTime = useRef<number>(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  useEffect(() => {
    const spawnItem = (width: number, height: number): GameItem | null => {
      const itemType = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      // Reduce bomb chance
      if (itemType.type === 'bomb' && Math.random() > 0.3) return null;

      return {
        id: Date.now() + Math.random(),
        x: Math.random() * (width - 60),
        y: height + 50,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 8 + 10), // Jump up speed
        rot: 0,
        vRot: (Math.random() - 0.5) * 10,
        type: itemType.type,
        emoji: itemType.emoji,
      };
    };

    const updateGame = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();

      // Spawn
      if (Date.now() - lastSpawnTime.current > 800) {
        const newItem = spawnItem(width, height);
        if (newItem) {
          setItems(prev => [...prev, newItem]);
        }
        lastSpawnTime.current = Date.now();
      }

      // Move & Cleanup
      setItems(prev => prev.map(item => ({
        ...item,
        x: item.x + item.vx,
        y: item.y + item.vy,
        vy: item.vy + 0.2, // Gravity
        rot: item.rot + item.vRot,
      })).filter(item => item.y < height + 100)); // Keep items until they fall below

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [onGameOver]);

  const handleSlash = (id: number, type: string) => {
    if (type === 'bomb') {
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        onGameOver('opponent'); // You died
      }
    } else {
      scoreRef.current += type === 'bonus' ? 5 : 1;
      setScore(scoreRef.current);
      // Remove item
      setItems(prev => prev.filter(i => i.id !== id));
      
      if (scoreRef.current >= 20) {
         onGameOver('me'); // Win threshold
      }
    }
  };

  return (
    <div className="relative w-full h-[400px] bg-gray-900 rounded-2xl overflow-hidden cursor-crosshair touch-none" ref={containerRef}>
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-bold z-10 flex gap-4">
        <div className="bg-black/50 px-3 py-1 rounded-full">Score: {score}/20</div>
        <div className="bg-black/50 px-3 py-1 rounded-full text-red-500">Lives: {'❤️'.repeat(lives)}</div>
      </div>

      {items.map(item => (
        <div
          key={item.id}
          className="absolute text-4xl select-none"
          style={{
            transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rot}deg)`,
            cursor: 'pointer'
          }}
          onPointerDown={() => handleSlash(item.id, item.type)}
        >
          {item.emoji}
        </div>
      ))}
      
      <div className="absolute bottom-2 right-2 text-white/20 text-xs">
        Tap fruits to slice! Avoid heartbreak 💔
      </div>
    </div>
  );
};
