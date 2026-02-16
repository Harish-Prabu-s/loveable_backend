import { create } from 'zustand';
import { walletApi } from '@/api/wallet';
import type { Wallet } from '@/types';
import { toast } from 'sonner';

interface WalletState {
  wallet: Wallet | null;
  isLoading: boolean;
  
  fetchWallet: () => Promise<void>;
  checkBalance: (amount: number) => boolean;
  deductCoins: (amount: number, description?: string) => Promise<boolean>;
  transferCoins: (amount: number, receiverId: number, description?: string) => Promise<boolean>;
  refundCoins: (amount: number, description?: string) => Promise<void>;
  addCoins: (amount: number, description?: string) => Promise<void>;
}

// Mock initial wallet for demo purposes if API fails
const MOCK_WALLET: Wallet = {
  id: 1,
  user: 1,
  coin_balance: 100, // Start with 100 coins
  total_earned: 0,
  total_spent: 0,
  updated_at: new Date().toISOString(),
};

export const useWalletStore = create<WalletState>()((set, get) => ({
  wallet: null,
  isLoading: false,

  fetchWallet: async () => {
    set({ isLoading: true });
    try {
      const wallet = await walletApi.getWallet();
      set({ wallet });
    } catch (error) {
      console.error('Failed to fetch wallet, using mock:', error);
      // Fallback to mock for demo
      set({ wallet: MOCK_WALLET });
    } finally {
      set({ isLoading: false });
    }
  },

  checkBalance: (amount: number) => {
    const { wallet } = get();
    if (!wallet) return false;
    return wallet.coin_balance >= amount;
  },

  deductCoins: async (amount: number, description = 'Spent') => {
    const { wallet } = get();
    if (!wallet || wallet.coin_balance < amount) {
      toast.error("Insufficient coins!");
      return false;
    }

    // Optimistic update
    const newBalance = wallet.coin_balance - amount;
    set({
      wallet: {
        ...wallet,
        coin_balance: newBalance,
        total_spent: wallet.total_spent + amount,
      }
    });

    try {
      await walletApi.spendCoins({ amount, description });
      return true;
    } catch (error: any) {
      // Revert if API fails
      set({ wallet });
      const msg = error?.response?.data?.error || "Transaction failed";
      toast.error(msg);
      return false;
    }
  },

  transferCoins: async (amount: number, receiverId: number, description = 'Transfer') => {
    const { wallet } = get();
    if (!wallet || wallet.coin_balance < amount) {
      toast.error("Insufficient coins!");
      return false;
    }

    // Optimistic update
    const newBalance = wallet.coin_balance - amount;
    set({
      wallet: {
        ...wallet,
        coin_balance: newBalance,
        total_spent: wallet.total_spent + amount,
      }
    });

    try {
      await walletApi.transferCoins({ amount, receiver_id: receiverId, description });
      return true;
    } catch (error: any) {
      // Revert
      set({ wallet });
      const msg = error?.response?.data?.error || "Transfer failed";
      toast.error(msg);
      return false;
    }
  },

  refundCoins: async (amount: number, description = 'Refund') => {
    const { wallet } = get();
    if (!wallet) return;

    // Optimistic update
    const newBalance = wallet.coin_balance + amount;
    set({
      wallet: {
        ...wallet,
        coin_balance: newBalance,
      }
    });
    
    try {
      await walletApi.refundCoins({ amount, description });
    } catch (error) {
       // Revert
       set({ wallet });
    }
  },

  addCoins: async (amount: number, description = 'Earned') => {
    const { wallet } = get();
    if (!wallet) return;

    // Optimistic update
    const newBalance = wallet.coin_balance + amount;
    set({
      wallet: {
        ...wallet,
        coin_balance: newBalance,
        total_earned: wallet.total_earned + amount,
      }
    });
    
    try {
      await walletApi.earnCoins({ amount, description });
    } catch (error) {
       // Revert
       set({ wallet });
       toast.error("Failed to add coins");
    }
  }
}));
