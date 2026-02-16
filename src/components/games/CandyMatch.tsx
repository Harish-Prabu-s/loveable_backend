import { useState, useEffect } from 'react';

const GRID_SIZE = 6;
const CANDIES = ['❤️', '🍬', '🍭', '🧁', '🍩', '🍪'];

export default function CandyMatch({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(15);

  // Initialize
  useEffect(() => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => CANDIES[Math.floor(Math.random() * CANDIES.length)])
    );
    setGrid(newGrid);
  }, []);

  const checkMatches = (currentGrid: string[][]) => {
    const matched = new Set<string>();
    
    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (currentGrid[r][c] === currentGrid[r][c+1] && currentGrid[r][c] === currentGrid[r][c+2]) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c+1}`);
          matched.add(`${r},${c+2}`);
        }
      }
    }
    // Vertical
    for (let r = 0; r < GRID_SIZE - 2; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c] === currentGrid[r+1][c] && currentGrid[r][c] === currentGrid[r+2][c]) {
          matched.add(`${r},${c}`);
          matched.add(`${r+1},${c}`);
          matched.add(`${r+2},${c}`);
        }
      }
    }
    return matched;
  };

  const handleInteraction = (r: number, c: number) => {
    if (moves <= 0) return;

    if (!selected) {
      setSelected({r, c});
    } else {
      // Check adjacency
      const isAdjacent = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
      
      if (isAdjacent) {
        // Swap
        const newGrid = [...grid.map(row => [...row])];
        const temp = newGrid[r][c];
        newGrid[r][c] = newGrid[selected.r][selected.c];
        newGrid[selected.r][selected.c] = temp;
        
        // Check Matches
        const matches = checkMatches(newGrid);
        
        if (matches.size > 0) {
           // Clear and Refill
           matches.forEach(key => {
             const [mr, mc] = key.split(',').map(Number);
             newGrid[mr][mc] = CANDIES[Math.floor(Math.random() * CANDIES.length)]; // Simple refill (replace)
             // Real gravity would be better but complex for this scope
           });
           setScore(s => s + matches.size * 10);
           setGrid(newGrid);
        } else {
           // Revert if strict, or just allow swap. Let's allow swap but no score.
           setGrid(newGrid);
        }
        setMoves(m => m - 1);
        setSelected(null);

        if (score > 300) onGameOver('me'); // Win condition
        if (moves <= 1 && score < 300) onGameOver('opponent'); // Loss condition
      } else {
        setSelected({r, c}); // Change selection
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-pink-100 rounded-2xl">
      <div className="flex justify-between w-full mb-4 font-bold text-gray-700">
        <div>Score: {score}</div>
        <div>Moves: {moves}</div>
      </div>
      
      <div className="grid grid-cols-6 gap-1 bg-white p-2 rounded-xl shadow-inner">
        {grid.map((row, r) => (
          row.map((candy, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleInteraction(r, c)}
                className={`w-10 h-10 flex items-center justify-center text-2xl cursor-pointer rounded-lg transition-all
                  ${isSelected ? 'bg-primary/30 scale-110 ring-2 ring-primary' : 'hover:bg-gray-100'}
                `}
              >
                {candy}
              </div>
            );
          })
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Swap candies to match 3!</p>
    </div>
  );
};
