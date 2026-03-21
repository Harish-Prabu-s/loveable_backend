import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { notify } from '@/lib/utils';
import { walletApi } from '@/api/wallet';
import { profilesApi } from '@/api/profiles';
import { chatApi } from '@/api/chat';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';

type CallType = 'voice' | 'video' | 'live';

interface CallState {
  isActive: boolean;
  isMinimized: boolean;
  isCaller: boolean;
  type: CallType | null;
  duration: number; // in seconds
  costPerMinute: number;
  otherUserId?: number;
  coinsSpent: number;
  roomId?: number;
}

interface CallContextType {
  callState: CallState;
  startCall: (type: CallType, targetMeta?: { gender?: 'M' | 'F' | 'O'; level?: number; userId?: number }) => Promise<void>;
  switchCallType: (newType: CallType) => void;
  endCall: (reason?: string) => void;
  toggleMinimize: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { checkBalance, deductCoins, transferCoins, refundCoins, fetchWallet } = useWalletStore();
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    isMinimized: false,
    isCaller: false,
    type: null,
    duration: 0,
    costPerMinute: 0,
    coinsSpent: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoConnectRef = useRef(false);
  const lastCallTypeRef = useRef<CallType | null>(null);


  const isHighRateTime = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    // Night time: 11 PM (23) to 4 AM (4)
    return hour >= 23 || hour < 4;
  }, []);

  const isStarWindow = isHighRateTime(); 

  const getCost = useCallback((type: CallType) => {
    const isNight = isHighRateTime();
    
    // Day Time (9 AM - 10 PM) & Standard Rules
    // Night Time (11 PM - 4 AM)
    
    if (isNight) {
      // Night Rates
      switch (type) {
        case 'voice': return 30;
        case 'video': return 100;
        case 'live': return 150;
        default: return 0;
      }
    } else {
      // Day/Standard Rates
      switch (type) {
        case 'voice': return 10;
        case 'video': return 60;
        case 'live': return 100;
        default: return 0;
      }
    }
  }, [isHighRateTime]);

  const findRandomUser = async () => {
    try {
      const profiles = await profilesApi.listProfiles('', { is_online: true, is_busy: false });
      if (!profiles || profiles.length === 0) return null;
      
      let validProfiles = profiles.filter(p => p.user !== user?.id);

      if (user?.gender === 'M') {
        validProfiles = validProfiles.filter(p => p.gender === 'F');
      }
      
      if (validProfiles.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * validProfiles.length);
      return validProfiles[randomIndex];
    } catch (error) {
      console.error('Failed to find random user', error);
      return null;
    }
  };

  const startCall = useCallback(async (type: CallType, targetMeta?: { gender?: 'M' | 'F' | 'O'; level?: number; userId?: number }) => {
    if (callState.isActive) return;

    lastCallTypeRef.current = type;

    let targetUserId = targetMeta?.userId;
    
    if (!targetUserId) {
      autoConnectRef.current = true;
      notify('info', 'FINDING_USER', { message: 'Looking for online users...' });
      const randomUser = await findRandomUser();
      
      if (!randomUser) {
        notify('error', 'NO_ONLINE_USERS', { message: 'No free online users found. Try again later.' });
        autoConnectRef.current = false;
        return;
      }
      targetUserId = randomUser.user;
      notify('success', 'USER_FOUND', { message: `Connecting to ${randomUser.display_name}...` });
    } else {
      autoConnectRef.current = false;
    }

    const isFemale = user?.gender === 'F';
    let cost = isFemale ? 0 : getCost(type);
    if (targetMeta?.gender === 'F' && (targetMeta.level || 0) >= 7 && isStarWindow) {
      switch (type) {
        case 'voice': cost = isFemale ? 0 : 60; break;
        case 'video': cost = isFemale ? 0 : 90; break;
        case 'live': cost = isFemale ? 0 : 120; break;
      }
    }
    
    if (cost > 0) {
      const walletStore = useWalletStore.getState();
      if (!walletStore.wallet) {
        await fetchWallet();
      }
      const currentWallet = useWalletStore.getState().wallet;
      if (!currentWallet || currentWallet.coin_balance < cost) {
        notify('error', 'INSUFFICIENT_FUNDS');
        return;
      }
    }
    
    let roomId: number | undefined;
    if (targetUserId) {
      try {
        const backendCallType: 'audio' | 'video' =
          type === 'video' ? 'video' : type === 'voice' ? 'audio' : 'video';
        const room = await chatApi.createRoom(targetUserId, backendCallType);
        roomId = room.id;
      } catch (e) {
        console.error('Failed to create or fetch room for call', e);
      }
    }
    
    setCallState({
      isActive: true,
      isMinimized: false,
      isCaller: true,
      type,
      duration: 0,
      costPerMinute: cost,
      otherUserId: targetUserId,
      coinsSpent: 0,
      roomId,
    });

    if (isFemale) {
      notify('success', 'CALL_STARTED_FREE', { type });
    } else {
      const rateMsg = isHighRateTime() ? 'Night Rates (9 PM - 3 AM)' : 'Day Rates';
      notify('success', 'CALL_STARTED_RATE', { type, cost, rate: rateMsg });
    }
  }, [callState.isActive, user?.gender, user?.id, isStarWindow, checkBalance, getCost, isHighRateTime, fetchWallet]);

  const switchCallType = useCallback((newType: CallType) => {
    if (!callState.isActive || callState.type === newType) return;

    const isFemale = user?.gender === 'F';
    const newCost = isFemale ? 0 : getCost(newType);
    
    // Check if user is star (same logic as startCall)
    // Note: We don't have targetMeta here easily unless we store it in callState. 
    // For now, using standard rates or we should store targetMeta in CallState.
    // Assuming standard upgrade/downgrade for simplicity or minimal cost check.
    
    // Simplification: If upgrading audio -> video, check balance for difference? 
    // Or just check if they have enough for 1 min of new cost.
    
    if (newCost > 0) {
       if (!checkBalance(newCost)) {
         notify('error', 'INSUFFICIENT_FUNDS');
         return;
       }
    }

    setCallState(prev => ({
      ...prev,
      type: newType,
      costPerMinute: newCost
    }));
    
    toast.success(`Switched to ${newType} call`);
  }, [callState.isActive, callState.type, user?.gender, checkBalance, getCost]);

  const endCall = useCallback((reason?: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // First Call Insurance Logic
    // If call lasted between 5s and 30s, refund the coins
    if (callState.duration >= 5 && callState.duration < 30 && callState.coinsSpent > 0) {
      refundCoins(callState.coinsSpent, 'Call Insurance Refund');
      notify('success', 'COINS_REFUNDED', { amount: callState.coinsSpent });
      toast.info("Call was too short. Coins refunded! 🛡️");
    }

    if (callState.roomId) {
      chatApi.endCallOnRoom(callState.roomId, callState.duration, callState.coinsSpent).catch((e) => {
        console.error('Failed to mark room as ended', e);
      });
    }

    setCallState({
      isActive: false,
      isMinimized: false,
      isCaller: false,
      type: null,
      duration: 0,
      costPerMinute: 0,
      coinsSpent: 0,
      roomId: undefined,
    });
    
    if (reason) {
      notify('info', 'CALL_ENDED', { message: `Call ended: ${reason}` });
    } else {
      notify('info', 'CALL_ENDED');
    }

    // Auto-connect retry logic
    if (autoConnectRef.current && (reason === 'rejected' || reason === 'busy' || reason === 'failed' || reason === 'no_answer')) {
      if (lastCallTypeRef.current) {
        notify('info', 'FINDING_NEXT_USER', { message: 'Connecting to next available user...' });
        // Use timeout to allow state to clear and UI to update
        setTimeout(() => {
          startCall(lastCallTypeRef.current!);
        }, 1500);
      }
    } else {
      // Reset auto connect if manual end or normal finish
      autoConnectRef.current = false;
    }

  }, [callState.duration, callState.coinsSpent, refundCoins, startCall]);

  const toggleMinimize = useCallback(() => {
    setCallState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  // Ensure wallet is loaded
  useEffect(() => {
    if (user?.id) {
      fetchWallet();
    }
  }, [user?.id, fetchWallet]);

  // Wallet loading
  useEffect(() => {
    if (user?.id) {
      fetchWallet();
    }
  }, [user?.id, fetchWallet]);

  useEffect(() => {
    if (callState.isActive) {
      timerRef.current = setInterval(() => {
        setCallState(prev => {
          const newDuration = prev.duration + 1;
          
          // Deduct coins logic:
          // 1. First deduction at 5 seconds (upfront for first minute)
          // 2. Subsequent deductions every 60 seconds after that (65s, 125s, etc.)
          const shouldDeduct = newDuration === 5 || (newDuration > 5 && (newDuration - 5) % 60 === 0);

          if (shouldDeduct) {
            if (prev.costPerMinute > 0) {
              const processPayment = async () => {
                let success = false;
                if (prev.otherUserId) {
                  // Transfer coins to the other user
                  success = await transferCoins(prev.costPerMinute, prev.otherUserId, 'Call Charge');
                } else {
                  // Fallback if no other user (shouldn't happen in real call)
                  success = await deductCoins(prev.costPerMinute, 'Call Charge');
                }

                if (!success) {
                   notify('error', 'INSUFFICIENT_FUNDS');
                   endCall();
                } else {
                   setCallState(curr => ({ ...curr, coinsSpent: curr.coinsSpent + prev.costPerMinute }));
                   notify('message', 'COINS_DEDUCTED', { amount: prev.costPerMinute });
                }
              };
              processPayment();
            }
            // XP gain and level update
            try {
              const currentXp = parseInt(localStorage.getItem('user_xp') || '0', 10) || 0;
              const nextXp = currentXp + 10; // 10 XP per minute of conversation
              localStorage.setItem('user_xp', String(nextXp));
              const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
              let lvl = 1;
              for (let i = thresholds.length - 1; i >= 0; i--) {
                if (nextXp >= thresholds[i]) {
                  lvl = i + 1;
                  break;
                }
              }
              lvl = Math.min(10, lvl);
              localStorage.setItem('user_level', String(lvl));
            } catch (e) {
              void 0;
            }
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState.isActive, deductCoins, endCall]);

  return (
    <CallContext.Provider
      value={{
        callState,
        startCall,
        switchCallType,
        endCall,
        toggleMinimize,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
