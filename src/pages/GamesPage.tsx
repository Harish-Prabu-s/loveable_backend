import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Play, Star, Users, Gamepad2, ArrowLeft, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import TicTacToe from '@/components/games/TicTacToe';
import FruitSlash from '@/components/games/FruitSlash';
import CandyMatch from '@/components/games/CandyMatch';
import CarromBoard from '@/components/games/CarromBoard';
import LudoBoard from '@/components/games/LudoBoard';

interface Game {
  id: string;
  title: string;
  description: string;
  players: string;
  rating: number;
  imageColor: string;
  isPopular?: boolean;
  imageUrl?: string;
}

const GAMES: Game[] = [
  { 
    id: 'tictactoe', 
    title: 'Tic Tac Toe', 
    description: 'Classic X and O game', 
    players: '15k+ Playing', 
    rating: 4.8, 
    imageColor: 'bg-blue-500',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1668901382969-8c73e450a1f5?w=500&auto=format&fit=crop&q=60'
  },
  { 
    id: 'ludo', 
    title: 'Ludo Classic', 
    description: 'Play the classic board game with friends', 
    players: '10k+ Playing', 
    rating: 4.8, 
    imageColor: 'bg-red-500',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1610890716254-d751959dc6c7?w=500&auto=format&fit=crop&q=60'
  },
  { 
    id: 'carrom', 
    title: 'Carrom Pro', 
    description: 'Strike and pocket the coins', 
    players: '5k+ Playing', 
    rating: 4.6, 
    imageColor: 'bg-yellow-500',
    imageUrl: 'https://images.unsplash.com/photo-1634907861962-675e01c40217?w=500&auto=format&fit=crop&q=60'
  },
  { 
    id: 'fruit', 
    title: 'Fruit Slash', 
    description: 'Slice fruits, avoid bombs!', 
    players: '8k+ Playing', 
    rating: 4.7, 
    imageColor: 'bg-green-500',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1615485925763-867862f80a90?w=500&auto=format&fit=crop&q=60'
  },
  { 
    id: 'candy', 
    title: 'Sweet Match', 
    description: 'Match 3 candies to win', 
    players: '12k+ Playing', 
    rating: 4.9, 
    imageColor: 'bg-pink-500',
    imageUrl: 'https://images.unsplash.com/photo-1582053433976-25c00369fc93?w=500&auto=format&fit=crop&q=60'
  },
];

// Tic Tac Toe Component Removed (Imported)

export default function GamesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { wallet, deductCoins, addCoins, fetchWallet } = useWalletStore();
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isBetMode, setIsBetMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (activeGame) {
      // Game Loop
      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        // Award 1 coin every 3 minutes (180 seconds) => 20 coins/hr
        if (secondsRef.current % 180 === 0 && !isBetMode) {
           // Normal Mode: 1 coin/3 min
           addCoins(1, 'Playtime Reward');
           toast.success("You earned 1 coin for playing!", { icon: '🪙' });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeGame, isBetMode, addCoins]);

  const handlePlayGame = async (game: Game) => {
    if (isBetMode) {
      // Bet Mode Logic
      const isFemale = user?.gender === 'F';
      
      if (!isFemale) {
         if (!window.confirm("Start Bet Match? Entry fee: 10 coins.")) return;
         
         // Check balance first
         if ((wallet?.coin_balance || 0) < 10) {
            toast.error("Insufficient coins! Please recharge.");
            return;
         }

         const success = await deductCoins(10, 'Game Entry Fee');
         if (!success) {
            toast.error("Transaction failed. Try again.");
            return;
         }
         toast.info("Searching for opponent...", { duration: 2000 });
      } else {
         // Female: Free
         toast.info("Searching for opponent (Free entry)...", { duration: 2000 });
      }

      setIsSearching(true);
      
      // Simulate Matchmaking (2 seconds)
      setTimeout(() => {
        setIsSearching(false);
        setActiveGame(game);
        toast.success("Opponent Found! Game Starting...");
      }, 2000);

    } else {
      // Normal Mode
      setActiveGame(game);
      toast.success(`Starting ${game.title}...`);
    }
  };

  const handleGameOver = (winner: 'me' | 'opponent' | 'draw') => {
    if (isBetMode) {
       if (winner === 'me') {
         toast.success("You Won! +30 Coins added to wallet.", { icon: '🏆', duration: 4000 });
         addCoins(30, 'Game Win');
       } else if (winner === 'opponent') {
         toast.error("You Lost. Better luck next time!", { icon: '💔' });
       } else {
         toast.info("It's a draw! Money returned.");
         addCoins(10, 'Game Draw Refund');
       }
    } else {
        if (winner === 'me') toast.success("You Won!");
        else if (winner === 'opponent') toast.info("You Lost!");
        else toast.info("Draw!");
    }
    setActiveGame(null);
  };

  if (activeGame) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="p-4 flex items-center justify-between bg-gray-900 text-white">
          <button 
            onClick={() => setActiveGame(null)}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold">{activeGame.title}</span>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-800 text-white p-8 text-center overflow-hidden">
          {activeGame.id === 'tictactoe' && <TicTacToe onGameOver={handleGameOver} />}
          {activeGame.id === 'fruit' && <FruitSlash onGameOver={(w) => handleGameOver(w)} />}
          {activeGame.id === 'candy' && <CandyMatch onGameOver={(w) => handleGameOver(w)} />}
          {activeGame.id === 'carrom' && <CarromBoard onGameOver={(w) => handleGameOver(w)} />}
          {activeGame.id === 'ludo' && <LudoBoard onGameOver={(w) => handleGameOver(w)} />}
          
          {isBetMode && ['tictactoe', 'fruit', 'candy', 'carrom', 'ludo'].includes(activeGame.id) && (
             <p className="mt-4 text-yellow-400 text-sm animate-pulse">Bet Mode Active: Win to earn 30 coins!</p>
          )}
        </div>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">Finding Opponent...</h2>
        <p className="text-gray-400">Matching with {user?.gender === 'F' ? 'Male' : 'Female'} player...</p>
        <p className="text-xs text-gray-500 mt-2">Connecting to opposite gender only...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-gray-900 text-white p-6 pb-12 rounded-b-3xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Game Zone</h1>
                    <p className="text-gray-400">Play, Compete, and Earn Coins!</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                    <span className="text-2xl">🪙</span>
                    <span className="font-bold text-xl">{wallet?.coin_balance || 0}</span>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
              <button
                onClick={() => setIsBetMode(false)}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${!isBetMode ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Fun Play
              </button>
              <button
                onClick={() => setIsBetMode(true)}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${isBetMode ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Bet Match 💰
              </button>
            </div>

            {isBetMode && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 text-sm">
                <p className="font-bold text-red-200 mb-1">🔥 Bet Match Rules:</p>
                <ul className="list-disc pl-4 text-red-100/80 space-y-1">
                  <li>Entry Fee: 10 Coins (Free for Women)</li>
                  <li>Opponent: Opposite Gender Only</li>
                  <li>Winner Reward: 30 Coins! 🏆</li>
                </ul>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 shadow-lg mb-8 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Daily Tournament</p>
                <p className="text-sm opacity-80">Win up to 5000 coins!</p>
              </div>
              <Trophy className="w-10 h-10 text-yellow-300" />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>

        <div className="p-4 space-y-6">

          {/* Games Grid */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Popular Games
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {GAMES.map((game) => (
                <div 
                  key={game.id}
                  onClick={() => handlePlayGame(game)}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
                >
                  <div className={`h-32 ${game.imageColor} flex items-center justify-center relative`}>
                    {game.imageUrl ? (
                      <>
                        <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                           <Gamepad2 className="w-10 h-10 text-white opacity-90 drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <Gamepad2 className="w-10 h-10 text-white/80" />
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-gray-900">{game.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Users className="w-3 h-3" />
                      {game.players}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-600 mt-1 font-medium">
                      <Star className="w-3 h-3 fill-yellow-500" />
                      {game.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
