import React, { useRef, useEffect, useState } from 'react';

export default function CarromBoard({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(10);
  
  // Game State Refs
  const striker = useRef({ x: 150, y: 250, vx: 0, vy: 0, r: 12, color: '#ec4899', isMoving: false });
  const coins = useRef<{x: number, y: number, vx: number, vy: number, r: number, color: string, value: number, active: boolean}[]>([]);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragCurrent = useRef({ x: 0, y: 0 });

  // Init Coins
  useEffect(() => {
    const initialCoins = [];
    // Queen
    initialCoins.push({ x: 150, y: 150, vx: 0, vy: 0, r: 10, color: '#ef4444', value: 50, active: true });
    // Circle of coins
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      initialCoins.push({
        x: 150 + 25 * Math.cos(angle),
        y: 150 + 25 * Math.sin(angle),
        vx: 0, vy: 0, r: 8, color: i % 2 === 0 ? '#ffffff' : '#1f2937', value: i % 2 === 0 ? 20 : 10, active: true
      });
    }
    coins.current = initialCoins;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updatePhysics = () => {
      const friction = 0.98;
      const boundary = 300;
      
      // Striker
      const s = striker.current;
      if (s.isMoving) {
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= friction;
        s.vy *= friction;

        // Bounce Walls
        if (s.x < s.r || s.x > boundary - s.r) s.vx *= -1;
        if (s.y < s.r || s.y > boundary - s.r) s.vy *= -1;

        // Stop
        if (Math.abs(s.vx) < 0.1 && Math.abs(s.vy) < 0.1) {
          s.vx = 0; s.vy = 0; s.isMoving = false;
          // Reset Position if stopped
          if (s.y < 200) {
             s.y = 250;
             s.x = 150;
          }
        }
      }

      // Coins
      coins.current.forEach(c => {
        if (!c.active) return;
        c.x += c.vx;
        c.y += c.vy;
        c.vx *= friction;
        c.vy *= friction;

        // Bounce Walls
        if (c.x < c.r || c.x > boundary - c.r) c.vx *= -1;
        if (c.y < c.r || c.y > boundary - c.r) c.vy *= -1;

        // Collision with Striker
        const dx = c.x - s.x;
        const dy = c.y - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < c.r + s.r) {
          // Simple Elastic Collision
          const angle = Math.atan2(dy, dx);
          const force = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
          c.vx += Math.cos(angle) * force * 1.2;
          c.vy += Math.sin(angle) * force * 1.2;
          s.vx *= -0.5;
          s.vy *= -0.5;
        }

        // Pockets (Corners)
        const pocketR = 20;
        if ((c.x < pocketR && c.y < pocketR) || (c.x > boundary-pocketR && c.y < pocketR) ||
            (c.x < pocketR && c.y > boundary-pocketR) || (c.x > boundary-pocketR && c.y > boundary-pocketR)) {
              c.active = false;
              setScore(prev => {
                const newScore = prev + c.value;
                if (newScore >= 100) {
                   // Win!
                   setTimeout(() => onGameOver('me'), 500);
                }
                return newScore;
              });
        }
      });
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, 300, 300);
      
      // Board
      ctx.fillStyle = '#fce7f3'; // Pink-100
      ctx.fillRect(0, 0, 300, 300);
      
      // Pockets
      ctx.fillStyle = '#831843'; // Pink-900
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(300, 0, 20, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 300, 20, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(300, 300, 20, 0, Math.PI*2); ctx.fill();

      // Baseline
      ctx.beginPath();
      ctx.moveTo(40, 250);
      ctx.lineTo(260, 250);
      ctx.strokeStyle = '#db2777';
      ctx.stroke();

      // Coins
      coins.current.forEach(c => {
        if (!c.active) return;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.stroke();
      });

      // Striker
      const s = striker.current;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();

      // Drag Line
      if (isDragging.current) {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + (dragStart.current.x - dragCurrent.current.x), s.y + (dragStart.current.y - dragCurrent.current.y));
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    let animationId: number;

    const loop = () => {
      updatePhysics();
      draw(ctx);
      animationId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationId);
  }, [onGameOver]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (striker.current.isMoving) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if touching striker
    const dx = x - striker.current.x;
    const dy = y - striker.current.y;
    if (dx*dx + dy*dy < 900) { // 30px radius hit area
      isDragging.current = true;
      dragStart.current = { x, y };
      dragCurrent.current = { x, y };
    } else if (y > 230 && y < 270) {
      // Move striker on baseline
      striker.current.x = Math.max(20, Math.min(280, x));
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragCurrent.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    // Shoot
    const dx = dragStart.current.x - dragCurrent.current.x;
    const dy = dragStart.current.y - dragCurrent.current.y;
    
    striker.current.vx = dx * 0.15;
    striker.current.vy = dy * 0.15;
    striker.current.isMoving = true;
    
    setShots(s => {
      const newShots = s - 1;
      if (newShots <= 0 && score < 50) setTimeout(() => onGameOver('opponent'), 1000);
      return newShots;
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full mb-2 text-white font-bold px-4">
        <span>Score: {score}</span>
        <span>Shots: {shots}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="bg-pink-100 rounded-xl shadow-2xl cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <p className="text-gray-400 text-xs mt-2">Drag Striker to aim. Pull back to shoot.</p>
    </div>
  );
};
