import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Wallet as WalletIcon, Coins, History, ArrowRight, Plus } from 'lucide-react';
import { walletApi } from '@/api/wallet';
import type { Wallet, CoinTransaction } from '@/types';

import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';

export default function WalletPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { wallet, isLoading: loading, fetchWallet } = useWalletStore();
  const isFemale = user?.gender === 'F';
  // const [wallet, setWallet] = useState<Wallet | null>(null); // Removed local state
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  // const [loading, setLoading] = useState(true); // Handled by store

  const isOfferTime = () => {
    const now = new Date();
    const h = now.getHours();
    return h >= 9 && h < 21;
  };
  const getOfferCountKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `offer_claim_count_${y}${m}${day}`;
  };
  const getOfferClaimsToday = (): number => {
    const key = getOfferCountKey();
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) || 0 : 0;
  };
  const remainingClaims = Math.max(0, 2 - getOfferClaimsToday());
  const userLevel = parseInt(localStorage.getItem('user_level') || '1', 10) || 1;
  const joinedAt = user?.date_joined ? new Date(user.date_joined) : new Date();
  const now = new Date();
  const daysSinceJoin = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));
  const isFirstTwoWeeks = daysSinceJoin < 14;
  const isSunday = now.getDay() === 0;
  const isMorningWindow = now.getHours() >= 7 && now.getHours() < 9;
  const minWithdrawBase = userLevel >= 10 ? 200 : (isMorningWindow ? 300 : 500);
  const minWithdraw = isFemale && (isFirstTwoWeeks || isSunday) ? 50 : minWithdrawBase;
  const rupees = Math.floor((wallet?.coin_balance ?? 0) / 10);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchWallet();
        const txData = await walletApi.getTransactions();
        setTransactions(txData.results);
      } catch (error) {
        console.error('Failed to load wallet data', error);
      }
    };

    loadData();
  }, [fetchWallet]);

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          
          {/* Header */}
          <h1 className="text-2xl font-bold text-foreground mb-6">My Wallet</h1>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-[#111827] via-[#020617] to-[#020617] rounded-2xl p-6 text-white shadow-xl mb-8 relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            
            <div className="relative z-10">
              <p className="text-white/70 text-sm font-medium mb-1">Available Balance</p>
              <div className="flex items-center gap-2 mb-6">
                <Coins className="w-8 h-8 text-yellow-400" />
                <span className="text-4xl font-bold">{loading ? '...' : wallet?.coin_balance ?? 0}</span>
              </div>

              {/* Offer Teaser */}
              <div className="bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/70">Today's Offer (9 AM - 9 PM)</p>
                    <p className="text-sm font-bold">700 Coins for ₹199</p>
                    <p className="text-[10px] text-white/60">Remaining: {isOfferTime() ? `${remainingClaims}/2` : '0/2'} • Night: No offer</p>
                  </div>
                  <button
                    onClick={() => navigate('/wallet/purchase')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold ${isOfferTime() && remainingClaims > 0 ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-gray-300 text-gray-700 cursor-not-allowed'}`}
                    disabled={!isOfferTime() || remainingClaims <= 0}
                  >
                    Get Offer
                  </button>
                </div>
              </div>

              {isFemale ? (
                <div className="bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm border border-white/10">
                  <p className="text-xs text-white/70 mb-1">Estimated Earnings</p>
                  <div className="flex items-center justify-between">
                     <span className="text-2xl font-bold">₹ {rupees}</span>
                     <button 
                       className={`text-white text-xs px-3 py-1.5 rounded-lg font-bold ${rupees >= minWithdraw ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                       disabled={rupees < minWithdraw}
                     >
                       Withdraw
                     </button>
                  </div>
                  <p className="text-[10px] text-white/60 mt-1">
                    Rate: 10 Coins = ₹1 • Min Withdraw: ₹{minWithdraw}
                    {isSunday ? ' • Sunday Offer active' : ''}
                    {isFirstTwoWeeks ? ' • First 2 weeks offer active' : ''}
                  </p>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/wallet/purchase')}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Coins
                </button>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Recent Transactions
            </h2>
            <button 
              onClick={() => navigate('/wallet/transactions')}
              className="text-primary text-sm font-medium flex items-center"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'credit' ? <Plus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 rotate-45" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.type === 'credit' ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No transactions yet
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
