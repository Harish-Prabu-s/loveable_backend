import React, { useEffect, useState } from 'react';
import { Gift, giftsApi } from '../api/gifts';
import { X, Gift as GiftIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useWalletStore } from '../store/walletStore';

interface GiftOverlayProps {
  onClose: () => void;
  receiverId: number;
}

export const GiftOverlay: React.FC<GiftOverlayProps> = ({ onClose, receiverId }) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const { wallet, fetchWallet } = useWalletStore();

  useEffect(() => {
    giftsApi.getGifts()
      .then(setGifts)
      .catch(() => toast.error("Failed to load gifts"))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (gift: Gift) => {
    if (!wallet) return;
    if (wallet.coin_balance < gift.cost) {
      toast.error("Insufficient coins! Top up wallet.");
      return;
    }

    try {
      console.log('Sending gift:', gift.id, 'to', receiverId);
      const res = await giftsApi.sendGift(gift.id, receiverId);
      console.log('Gift response:', res);
      
      // Check for success property or if the response itself indicates success (e.g. status 200/201 implicit in data)
      // @ts-ignore
      if (res && (res.success || res.status === 'success' || res.coins_spent)) {
        toast.success(`Sent ${gift.name}!`);
        fetchWallet(); // Sync wallet
        onClose();
      } else {
         toast.error("Gift sent but no confirmation received");
      }
    } catch (e: any) {
      console.error("Gift error:", e);
      toast.error(e.response?.data?.error || "Failed to send gift");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900/90 border border-white/10 p-6 rounded-2xl w-full max-w-sm mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <GiftIcon className="w-6 h-6 text-pink-500" />
            <h2 className="text-xl font-bold text-white">Send a Gift</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
           <div className="text-center py-8 text-gray-400">Loading gifts...</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {gifts.map(gift => (
              <button
                key={gift.id}
                onClick={() => handleSend(gift)}
                className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-pink-500/20 hover:border-pink-500/50 border border-transparent transition-all group"
              >
                <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform duration-200">{gift.icon}</div>
                <span className="text-sm font-medium text-gray-200 mb-1">{gift.name}</span>
                <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
                  <span className="text-xs text-yellow-400 font-bold">{gift.cost}</span>
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">Coins deducted from your wallet</p>
        </div>
      </div>
    </div>
  );
};
