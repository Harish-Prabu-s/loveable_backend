import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';

export default function TicTacToe({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent' | 'draw') => void }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  
  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const result = calculateWinner(board);
  const winner = result?.winner;

  useEffect(() => {
    if (result?.line) {
      setWinningLine(result.line);
    }
  }, [result]);

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const newBoard = [...board];
    newBoard[i] = 'X'; // User is always X
    setBoard(newBoard);
    setIsXNext(false);
  };

  // Bot Turn
  useEffect(() => {
    if (!isXNext && !winner && board.includes(null)) {
      const timer = setTimeout(() => {
        const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        
        // Smart(ish) Bot: 50% chance to block or random
        let moveIndex;
        // ... simplistic random for now
        moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        
        const newBoard = [...board];
        newBoard[moveIndex] = 'O';
        setBoard(newBoard);
        setIsXNext(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isXNext, winner, board]);

  useEffect(() => {
    if (winner) {
      const timer = setTimeout(() => {
        if (winner === 'X') onGameOver('me');
        else onGameOver('opponent');
      }, 1500); // Delay to show winning animation
      return () => clearTimeout(timer);
    } else if (!board.includes(null)) {
      const timer = setTimeout(() => onGameOver('draw'), 1500);
      return () => clearTimeout(timer);
    }
  }, [winner, board, onGameOver]);

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Score/Status Header */}
      <div className="flex items-center justify-between w-full mb-6 bg-gray-800/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className={`flex flex-col items-center ${isXNext ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
           <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">You</span>
           <span className="text-2xl font-black text-cyan-400">X</span>
        </div>
        
        <div className="h-8 w-[1px] bg-white/10"></div>
        
        <div className="text-center">
            {winner ? (
                <div className="flex flex-col items-center animate-bounce">
                    <Trophy className="w-6 h-6 text-yellow-400 mb-1" />
                    <span className="text-xs font-bold text-yellow-400 uppercase">{winner === 'X' ? 'Victory!' : 'Defeat'}</span>
                </div>
            ) : (
                <span className="text-xs font-medium text-gray-400 animate-pulse">
                    {isXNext ? 'Your Turn' : 'Thinking...'}
                </span>
            )}
        </div>

        <div className="h-8 w-[1px] bg-white/10"></div>

        <div className={`flex flex-col items-center ${!isXNext ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
           <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">CPU</span>
           <span className="text-2xl font-black text-pink-500">O</span>
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gray-800 rounded-2xl shadow-2xl border border-white/5 relative">
        {board.map((square, i) => {
            const isWinningSquare = winningLine?.includes(i);
            return (
              <button
                key={i}
                className={`w-20 h-20 sm:w-24 sm:h-24 text-5xl font-black flex items-center justify-center rounded-xl transition-all duration-300 relative overflow-hidden
                  ${square 
                    ? 'bg-gray-700 shadow-inner' 
                    : 'bg-gray-700/50 hover:bg-gray-700 hover:scale-95 cursor-pointer'
                  }
                  ${isWinningSquare ? 'ring-4 ring-yellow-400 z-10' : ''}
                `}
                onClick={() => handleClick(i)}
                disabled={!!square || !!winner || !isXNext}
              >
                {square === 'X' && (
                    <span className="text-cyan-400 animate-in zoom-in duration-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">X</span>
                )}
                {square === 'O' && (
                    <span className="text-pink-500 animate-in zoom-in duration-300 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">O</span>
                )}
              </button>
            );
        })}
        
        {/* Winning Line Overlay (Optional, using borders for now) */}
      </div>
      
      <p className="mt-6 text-xs text-gray-500 text-center max-w-[200px]">
        Win to earn <span className="text-yellow-400 font-bold">20 coins</span>. 
        <br/>Draw refunds entry.
      </p>
    </div>
  );
}
