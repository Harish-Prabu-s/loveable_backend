import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { History, ArrowLeft, Plus, ArrowRight } from 'lucide-react';
import { walletApi } from '@/api/wallet';
import type { CoinTransaction } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const txData = await walletApi.getTransactions();
        setTransactions(txData.results);
      } catch (error) {
        console.error('Failed to load transactions', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading transactions...</div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'credit' ? <Plus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 rotate-45" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tx.description}</p>
                        <p className="text-xs text-gray-500">
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
