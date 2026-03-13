import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Coins, Check, CreditCard, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { notify } from '../lib/utils';
import { walletApi } from '../api/wallet';
import apiClient from '../api/client';
import { offersApi, Offer } from '../api/offers';
import { toast } from 'sonner';
import { PaymentModal } from '../components/PaymentModal';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';

const loadScript = (src: string) => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface CoinPackage {
  id: number;
  title: string;
  coins: number;
  price: number;
  bonus?: number;
  popular?: boolean;
  offer_type: string;
}

export default function PurchaseCoinsPage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirming' | 'razorpay_open' | 'verifying' | 'success'>('idle');
  
  const { user } = useAuthStore();
  
  // First time offer logic
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);

  const isOfferTime = () => {
    // Every day special offer logic (keep frontend logic for now if backend doesn't support time-windows per user)
    return true; 
  };
  
  // Special offers state
  const [firstTimePackage, setFirstTimePackage] = useState<CoinPackage | null>(null);
  const [dailyOfferPackage, setDailyOfferPackage] = useState<CoinPackage | null>(null);
  const { fetchWallet } = useWalletStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [wallet, offersRes] = await Promise.all([
          walletApi.getWallet(),
          offersApi.listOffers()
        ]);

        // Check if first purchase
        setIsFirstPurchase(!wallet.has_purchased);

        // Process offers
        const regularPackages: CoinPackage[] = [];
        let foundFirstTime = null;
        let foundDaily = null;

        offersRes.data.forEach((offer: Offer) => {
          const pkg: CoinPackage = {
            id: offer.id,
            title: offer.title,
            coins: offer.coins_awarded,
            price: parseFloat(offer.price),
            bonus: offer.discount_coins || 0,
            popular: offer.title.toLowerCase().includes('pro') || offer.title.toLowerCase().includes('popular'),
            offer_type: offer.offer_type
          };

          // Categorize offers (This logic depends on how you want to tag them in backend. 
          // For now, I'll assume 'coin_package' are regular, unless title says 'Starter' or 'Daily')
          if (offer.title.toLowerCase().includes('starter') && !wallet.has_purchased) {
            foundFirstTime = pkg;
          } else if (offer.title.toLowerCase().includes('daily') || offer.title.toLowerCase().includes('offer')) {
            foundDaily = pkg;
          } else {
            regularPackages.push(pkg);
          }
        });

        // Sort regular packages by price
        regularPackages.sort((a, b) => a.price - b.price);

        setPackages(regularPackages);
        setFirstTimePackage(foundFirstTime);
        setDailyOfferPackage(foundDaily);
        
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load coin packages");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const incrementOfferClaims = () => {
    const key = getOfferCountKey();
    const current = getOfferClaimsToday();
    localStorage.setItem(key, String(current + 1));
  };

  const remainingClaims = Math.max(0, 2 - getOfferClaimsToday());

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPaymentStatus('confirming');
  };

  const handleConfirmPayment = async () => {
      setPaymentStatus('razorpay_open');
      
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
          toast.error('Razorpay SDK failed to load');
          setPaymentStatus('confirming');
          return;
      }

      try {
        const { data } = await apiClient.post('/wallet/create_order/', { 
            amount: selectedPackage?.price, 
            currency: 'INR' 
        });

        if (!data.success) throw new Error(data.error);

        const options = {
            key: data.key_id,
            amount: data.amount,
            currency: data.currency,
            name: 'Vibely',
            description: `Purchase ${selectedPackage?.coins} Coins`,
            image: 'https://vibely.app/logo.png',
            order_id: data.order_id,
            handler: async function (response: any) {
                setPaymentStatus('verifying');
                try {
                    const res = await walletApi.purchase(selectedPackage!.price, selectedPackage!.coins, response);
                    if (res && (res.success || res.payment_id)) {
                        await fetchWallet();
                        setPaymentStatus('success');
                        notify('success', 'PURCHASE_SUCCESS', { coins: selectedPackage!.coins });
                        setTimeout(() => {
                            setPaymentStatus('idle');
                        }, 2000);
                    }
                } catch (e) {
                    console.error(e);
                    toast.error('Verification failed');
                    setPaymentStatus('idle');
                }
            },
            prefill: {
                name: user?.display_name || 'User',
                email: user?.email || 'user@example.com',
                contact: user?.phone_number || ''
            },
            theme: { color: '#ec4899' },
            modal: {
                ondismiss: function() {
                    setPaymentStatus('idle');
                }
            }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (e: any) {
          console.error(e);
          toast.error(e.message || 'Payment failed');
          setPaymentStatus('idle');
      }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Buy Coins</h1>
        </div>

        <div className="p-4 max-w-md mx-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white mb-6 shadow-lg text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
               <Coins className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Recharge Wallet</h2>
            <p className="opacity-90">Get coins to make voice & video calls</p>
          </div>

          {/* First Time Offer */}
          {isFirstPurchase && firstTimePackage && (
            <div className="mb-6">
               <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-4 shadow-lg text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-bl-lg text-black">
                    FIRST TIME ONLY
                  </div>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                       <p className="text-lg font-bold">{firstTimePackage.title}</p>
                       <p className="text-sm opacity-90">Get {firstTimePackage.coins} Coins for just ₹{firstTimePackage.price}!</p>
                    </div>
                    <button 
                      onClick={() => setSelectedPackage(firstTimePackage)}
                      className="bg-white text-pink-600 font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      Buy Now
                    </button>
                  </div>
               </div>
            </div>
          )}

          {/* Daily Offer (Mocked Logic with Backend Data if available) */}
          <div className="mb-6">
            <div className={`rounded-2xl p-4 shadow-lg border ${isOfferTime() ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700">Daily Offer (9 AM - 9 PM)</p>
                  <p className="text-xs text-gray-500">
                     {dailyOfferPackage ? `${dailyOfferPackage.coins} Coins for ₹${dailyOfferPackage.price}` : 'Special rates coming soon'}
                  </p>
                  <p className="text-xs mt-1">
                    {isOfferTime() 
                      ? `Available today: ${remainingClaims} claim(s) left`
                      : 'No offer right now (Night: 9 PM - 3 AM)'}
                  </p>
                </div>
                <button
                  disabled={!isOfferTime() || remainingClaims <= 0 || !dailyOfferPackage}
                  onClick={() => {
                    if (!dailyOfferPackage) return;
                    if (!isOfferTime()) {
                      toast.error('Offer available only between 9 AM and 9 PM');
                      return;
                    }
                    if (remainingClaims <= 0) {
                      toast.error('Offer limit reached for today');
                      return;
                    }
                    setSelectedPackage(dailyOfferPackage);
                    incrementOfferClaims();
                    toast.success(`Offer applied: ${dailyOfferPackage.coins} Coins`);
                  }}
                  className={`px-4 py-2 rounded-lg font-bold ${isOfferTime() && remainingClaims > 0 && dailyOfferPackage ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  Apply Offer
                </button>
              </div>
            </div>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {packages.map((pkg) => (
              <div 
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative bg-white rounded-xl p-4 border-2 cursor-pointer transition-all shadow-sm
                  ${selectedPackage?.id === pkg.id 
                    ? 'border-primary bg-primary/5 transform scale-[1.02]' 
                    : 'border-transparent hover:border-gray-200'
                  }
                `}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {pkg.coins}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Coins</div>
                  
                  {pkg.bonus && pkg.bonus > 0 ? (
                    <div className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-md font-medium mb-3">
                      +{pkg.bonus} Bonus
                    </div>
                  ) : null}

                  <div className="bg-gray-100 rounded-lg py-2 px-4 font-bold text-gray-800">
                    ₹{pkg.price}
                  </div>
                </div>

                {selectedPackage?.id === pkg.id && (
                  <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Payment Section (Shows when package selected) */}
          {selectedPackage && (
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 animate-in slide-in-from-bottom-10">
              <div className="max-w-md mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-gray-500 text-sm">Total to pay</p>
                    <p className="text-3xl font-bold text-gray-900">₹{selectedPackage.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-sm">You get</p>
                    <p className="text-xl font-bold text-yellow-600 flex items-center justify-end">
                      <Coins className="w-4 h-4 mr-1" />
                      {selectedPackage.coins + (selectedPackage.bonus || 0)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={processing}
                  className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay Securely
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>100% Secure Payment with UPI / Cards</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Modal */}
          {selectedPackage && (
            <PaymentModal 
              isOpen={paymentStatus === 'confirming' || paymentStatus === 'verifying' || paymentStatus === 'success'}
              onClose={() => setPaymentStatus('idle')}
              amount={selectedPackage.price}
              coins={selectedPackage.coins + (selectedPackage.bonus || 0)}
              onConfirm={handleConfirmPayment}
              status={
                  paymentStatus === 'verifying' ? 'processing' :
                  paymentStatus === 'success' ? 'success' :
                  'idle'
              }
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
