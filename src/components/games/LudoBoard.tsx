import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';

export default function LudoBoard({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const [playerPos, setPlayerPos] = useState(0);
  const [botPos, setBotPos] = useState(0);
  const [turn, setTurn] = useState<'me' | 'opponent'>('me');
  const [diceValue, setDiceValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("Your Turn! Tap Dice.");

  const WIN_POS = 50;

  const rollDice = () => Math.floor(Math.random() * 6) + 1;

  const handleRoll = async () => {
    if (turn !== 'me' || rolling) return;

    setRolling(true);
    setMessage("Rolling...");
    
    // Animation simulation
    let val = 1;
    for(let i=0; i<10; i++) {
        val = rollDice();
        setDiceValue(val);
        await new Promise(r => setTimeout(r, 100));
    }
    setRolling(false);

    // Move
    const newPos = playerPos + val;
    if (newPos <= WIN_POS) {
        setPlayerPos(newPos);
        if (newPos === WIN_POS) {
            setMessage("You Reached Home! 🏆");
            setTimeout(() => onGameOver('me'), 1000);
            return;
        }
    } else {
        setMessage("Need exact roll!");
    }

    // Switch turn
    setTurn('opponent');
  };

  // Bot Turn
  useEffect(() => {
    if (turn === 'opponent') {
        setMessage("Opponent's Turn...");
        const timer = setTimeout(async () => {
            setRolling(true);
            let val = 1;
            for(let i=0; i<10; i++) {
                val = rollDice();
                setDiceValue(val);
                await new Promise(r => setTimeout(r, 100));
            }
            setRolling(false);

            const newPos = botPos + val;
            if (newPos <= WIN_POS) {
                setBotPos(newPos);
                if (newPos === WIN_POS) {
                    setMessage("Opponent Won! 😢");
                    setTimeout(() => onGameOver('opponent'), 1000);
                    return;
                }
            }
            setTurn('me');
            setMessage("Your Turn!");
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [turn, botPos, onGameOver]);

  const DiceIcon = [Dice1, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6][diceValue];

  return (
    <div className="flex flex-col items-center w-full max-w-md bg-white p-4 rounded-xl shadow-xl">
      <div className="mb-4 text-xl font-bold text-gray-800">{message}</div>
      
      {/* Board */}
      <div className="w-full h-16 bg-gray-200 rounded-full relative mb-8 overflow-hidden border-4 border-gray-300">
        {/* Track */}
        <div className="absolute top-0 left-0 h-full bg-blue-100 w-full flex items-center px-4">
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-1 h-full border-r border-white/50" />
            ))}
        </div>
        
        {/* Goal */}
        <div className="absolute right-0 top-0 h-full w-12 bg-yellow-400 flex items-center justify-center font-bold text-xs">
            HOME
        </div>

        {/* Player Token */}
        <motion.div 
            className="absolute top-2 w-5 h-5 bg-primary rounded-full border-2 border-white shadow-lg z-10"
            animate={{ left: `${(playerPos / WIN_POS) * 90}%` }}
        >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-primary">You</div>
        </motion.div>

        {/* Bot Token */}
        <motion.div 
            className="absolute bottom-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg z-10"
            animate={{ left: `${(botPos / WIN_POS) * 90}%` }}
        >
             <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500">Bot</div>
        </motion.div>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-center">
            <p className="text-sm text-gray-500">You</p>
            <p className="text-2xl font-bold text-primary">{playerPos}/{WIN_POS}</p>
        </div>

        <button 
            onClick={handleRoll}
            disabled={turn !== 'me' || rolling}
            className={`w-24 h-24 rounded-xl flex items-center justify-center transition-all ${
                turn === 'me' && !rolling 
                ? 'bg-primary text-white shadow-lg scale-105 active:scale-95' 
                : 'bg-gray-100 text-gray-400'
            }`}
        >
            <DiceIcon className={`w-12 h-12 ${rolling ? 'animate-spin' : ''}`} />
        </button>

        <div className="text-center">
            <p className="text-sm text-gray-500">Bot</p>
            <p className="text-2xl font-bold text-red-500">{botPos}/{WIN_POS}</p>
        </div>
      </div>
      
      <p className="mt-6 text-xs text-gray-400">Reach 50 steps to win!</p>
    </div>
  );
};
