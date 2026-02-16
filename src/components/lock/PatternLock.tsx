import React, { useState, useRef, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';

interface PatternLockProps {
  onComplete: (pattern: number[]) => void;
  title?: string;
  error?: boolean;
  onBack?: () => void;
}

export default function PatternLock({ onComplete, title = "Draw Pattern", error = false, onBack }: PatternLockProps) {
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);

  // 3x3 Grid
  const dots = Array.from({ length: 9 }, (_, i) => i);

  const getTouchPos = (e: React.PointerEvent | PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getDotIndex = (x: number, y: number) => {
    // Simple proximity check
    // Assuming container is around 300x300
    // Dots are at ~16%, 50%, 83%
    if (!containerRef.current) return -1;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Check each dot position
    for (let i = 0; i < 9; i++) {
      const dot = dotsRef.current[i];
      if (dot) {
        const rect = dot.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const dotX = rect.left - containerRect.left + rect.width / 2;
        const dotY = rect.top - containerRect.top + rect.height / 2;
        
        const dist = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));
        if (dist < 30) { // 30px radius hit area
          return i;
        }
      }
    }
    return -1;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent scrolling
    setIsDragging(true);
    const { x, y } = getTouchPos(e);
    setCurrentPos({ x, y });
    
    const index = getDotIndex(x, y);
    if (index !== -1) {
      setPattern([index]);
      if (navigator.vibrate) navigator.vibrate(10);
    } else {
      setPattern([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const { x, y } = getTouchPos(e);
    setCurrentPos({ x, y });

    const index = getDotIndex(x, y);
    if (index !== -1 && !pattern.includes(index)) {
      setPattern(prev => [...prev, index]);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (pattern.length >= 4) {
      onComplete(pattern);
      setTimeout(() => setPattern([]), 300); // Clear after brief delay
    } else if (pattern.length > 0) {
      // Too short
      setPattern([]);
    }
  };

  // Helper to get dot coordinates for SVG lines
  const getDotCoords = (index: number) => {
    const dot = dotsRef.current[index];
    if (!dot || !containerRef.current) return { x: 0, y: 0 };
    const rect = dot.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2
    };
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto animate-in fade-in zoom-in duration-300 select-none">
      <h2 className="text-xl font-bold mb-6 text-gray-800">{title}</h2>

      <div 
        ref={containerRef}
        className="relative w-64 h-64 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {pattern.map((dotIndex, i) => {
            if (i === pattern.length - 1) return null;
            const start = getDotCoords(dotIndex);
            const end = getDotCoords(pattern[i + 1]);
            return (
              <line
                key={i}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={error ? "#ef4444" : "#ec4899"} // Primary pink or Red error
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
          {/* Current Drag Line */}
          {isDragging && pattern.length > 0 && (
            <line
              x1={getDotCoords(pattern[pattern.length - 1]).x}
              y1={getDotCoords(pattern[pattern.length - 1]).y}
              x2={currentPos.x}
              y2={currentPos.y}
              stroke={error ? "#ef4444" : "#ec4899"}
              strokeWidth="4"
              strokeLinecap="round"
              className="opacity-50"
            />
          )}
        </svg>

        {/* Dots Grid */}
        <div className="grid grid-cols-3 gap-8 w-full h-full p-4">
          {dots.map((i) => (
            <div key={i} className="flex items-center justify-center">
              <div
                ref={(el) => { dotsRef.current[i] = el; }}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pattern.includes(i) 
                    ? (error ? 'bg-red-500 scale-125' : 'bg-primary scale-125') 
                    : 'bg-gray-300'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        {onBack && (
           <button onClick={onBack} className="text-sm text-gray-500 font-medium hover:text-gray-800">
             Cancel
           </button>
        )}
        <button 
          onClick={() => setPattern([])}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
        >
          <RefreshCcw className="w-4 h-4" /> Reset
        </button>
      </div>
    </div>
  );
}
