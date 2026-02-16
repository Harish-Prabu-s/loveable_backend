
export interface Game {
  id: string;
  title: string;
  description: string;
  players: string;
  rating: number;
  imageColor: string;
  isPopular?: boolean;
  imageUrl?: string;
}

export const GAMES: Game[] = [
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
