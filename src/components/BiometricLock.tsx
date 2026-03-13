import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Grid, Grid3x3, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import PinPad from './lock/PinPad';
import PatternLock from './lock/PatternLock';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

interface BiometricLockProps {
  children: React.ReactNode;
}

type LockMethod = 'biometric' | 'pin' | 'pattern';

export default function BiometricLock({ children }: BiometricLockProps) {
  const { user } = useAuthStore();
  const [isLocked, setIsLocked] = useState(false);
  const [activeMethod, setActiveMethod] = useState<LockMethod>('biometric');
  const [error, setError] = useState(false);
  
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [savedPattern, setSavedPattern] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // Reset State
  const [isResetting, setIsResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const lockEnabled = localStorage.getItem(`user_${user.id}_app_lock_enabled`) === 'true';
    const pin = localStorage.getItem(`user_${user.id}_app_lock_pin`);
    const pattern = localStorage.getItem(`user_${user.id}_app_lock_pattern`);
    const bio = localStorage.getItem(`user_${user.id}_app_lock_biometric`) !== 'false'; // Default true
    const method = localStorage.getItem(`user_${user.id}_app_lock_method`) as LockMethod || 'biometric';

    setSavedPin(pin);
    setSavedPattern(pattern);
    setBiometricEnabled(bio);

    if (lockEnabled) {
      setIsLocked(true);
      // Determine initial method
      if (bio) {
        setActiveMethod('biometric');
      } else if (method === 'pattern' && pattern) {
        setActiveMethod('pattern');
      } else if (pin) {
        setActiveMethod('pin');
      } else {
        // Fallback or setup needed (shouldn't happen if logic is correct)
        setActiveMethod('biometric');
      }
    } else {
      setIsLocked(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const handler = () => {
      if (!user?.id) return;
      const lockEnabled = localStorage.getItem(`user_${user.id}_app_lock_enabled`) === 'true';
      setIsLocked(lockEnabled);
      setSavedPin(localStorage.getItem(`user_${user.id}_app_lock_pin`));
      setSavedPattern(localStorage.getItem(`user_${user.id}_app_lock_pattern`));
      setBiometricEnabled(localStorage.getItem(`user_${user.id}_app_lock_biometric`) !== 'false');
    };
    window.addEventListener('app_lock_changed', handler);
    return () => window.removeEventListener('app_lock_changed', handler);
  }, [user?.id]);

  useEffect(() => {
    const onVis = () => {
      if (!user?.id) return;
      if (document.visibilityState === 'visible') {
        const lockEnabled = localStorage.getItem(`user_${user.id}_app_lock_enabled`) === 'true';
        if (lockEnabled) setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user?.id]);

  const handleBiometricUnlock = async () => {
    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate success rate
          if (Math.random() > 0.1) resolve('Verified');
          else reject('Failed');
        }, 1000);
      }),
      {
        loading: 'Verifying identity...',
        success: () => {
          setIsLocked(false);
          return 'Identity verified';
        },
        error: (err) => {
          setError(true);
          setTimeout(() => setError(false), 500);
          return 'Authentication failed';
        },
      }
    );
  };

  const handlePinSubmit = (pin: string) => {
    if (pin === savedPin) {
      setIsLocked(false);
      toast.success('Unlocked');
    } else {
      setError(true);
      toast.error('Incorrect PIN');
      setTimeout(() => setError(false), 500);
    }
  };

  const handlePatternSubmit = (pattern: number[]) => {
    if (JSON.stringify(pattern) === savedPattern) {
      setIsLocked(false);
      toast.success('Unlocked');
    } else {
      setError(true);
      toast.error('Incorrect Pattern');
      setTimeout(() => setError(false), 500);
    }
  };

  const handleSendResetOtp = async () => {
    if (!user?.phone_number) {
      toast.error("No phone number found to send OTP");
      return;
    }
    
    try {
      setOtpSent(false);
      await authApi.sendOTP({ phone_number: user.phone_number });
      setOtpSent(true);
      setIsResetting(true);
      toast.success(`OTP sent to ${user.phone_number}`);
    } catch (err) {
      toast.error("Failed to send OTP");
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!resetOtp || resetOtp.length < 4) {
      toast.error("Please enter valid OTP");
      return;
    }
    
    if (!user?.phone_number) return;

    setIsVerifyingOtp(true);
    try {
      await authApi.verifyOTP({ 
        phone_number: user.phone_number, 
        otp_code: resetOtp 
      });
      
      // Reset Lock Settings
      if (user?.id) {
        localStorage.removeItem(`user_${user.id}_app_lock_enabled`);
        localStorage.removeItem(`user_${user.id}_app_lock_pin`);
        localStorage.removeItem(`user_${user.id}_app_lock_pattern`);
        localStorage.removeItem(`user_${user.id}_app_lock_method`);
        localStorage.removeItem(`user_${user.id}_app_lock_biometric`);
      }
      
      setIsLocked(false);
      setIsResetting(false);
      toast.success("App Lock Reset Successfully");
    } catch (err) {
      toast.error("Invalid OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      
      {isResetting ? (
        <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl border border-gray-100 text-center">
           <div className="flex justify-center mb-4">
             <div className="p-4 bg-blue-50 rounded-full">
               <RefreshCw className="w-8 h-8 text-blue-500" />
             </div>
           </div>
           <h2 className="text-xl font-bold mb-2">Reset App Lock</h2>
           <p className="text-sm text-gray-500 mb-6">
             Enter the OTP sent to <br/>
             <span className="font-bold text-gray-900">{user?.phone_number}</span>
           </p>

           <div className="mb-6">
             <input
               type="text"
               value={resetOtp}
               onChange={(e) => setResetOtp(e.target.value)}
               placeholder="Enter OTP"
               className="w-full text-center text-2xl font-bold tracking-widest py-3 border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
               maxLength={6}
             />
           </div>

           <button
             onClick={handleVerifyResetOtp}
             disabled={isVerifyingOtp}
             className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {isVerifyingOtp ? 'Verifying...' : 'Reset Lock'}
             {!isVerifyingOtp && <CheckCircle2 className="w-5 h-5" />}
           </button>

           <button
             onClick={() => { setIsResetting(false); setResetOtp(''); }}
             className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium"
           >
             Cancel
           </button>
        </div>
      ) : (
        <>
      {/* Header Area */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Lock className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">App Locked</h2>
        <p className="text-muted-foreground text-sm">
          {activeMethod === 'biometric' && "Verify identity to continue"}
          {activeMethod === 'pin' && "Enter your PIN"}
          {activeMethod === 'pattern' && "Draw your Pattern"}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-sm">
        {activeMethod === 'biometric' && (
          <div className="space-y-6">
            <button
              onClick={handleBiometricUnlock}
              className="w-full py-12 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-primary/50 transition-all group flex flex-col items-center gap-4"
            >
              <Fingerprint className="w-16 h-16 text-gray-400 group-hover:text-primary transition-colors" />
              <span className="font-semibold text-gray-600 group-hover:text-primary">Tap to Scan</span>
            </button>
          </div>
        )}

        {activeMethod === 'pin' && (
          <PinPad 
            onComplete={handlePinSubmit} 
            error={error}
            title="" 
          />
        )}

        {activeMethod === 'pattern' && (
          <PatternLock 
            onComplete={handlePatternSubmit} 
            error={error}
            title=""
          />
        )}
      </div>

      {/* Footer / Switcher */}
      <div className="mt-12 flex flex-col items-center gap-8">
        <div className="flex gap-4 justify-center">
        {biometricEnabled && activeMethod !== 'biometric' && (
          <button 
            onClick={() => setActiveMethod('biometric')}
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <div className="p-3 bg-gray-100 rounded-full hover:bg-primary/10">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Biometric</span>
          </button>
        )}

        {savedPin && activeMethod !== 'pin' && (
          <button 
            onClick={() => setActiveMethod('pin')}
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <div className="p-3 bg-gray-100 rounded-full hover:bg-primary/10">
              <Grid className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">PIN</span>
          </button>
        )}

        {savedPattern && activeMethod !== 'pattern' && (
          <button 
            onClick={() => setActiveMethod('pattern')}
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <div className="p-3 bg-gray-100 rounded-full hover:bg-primary/10">
              <Grid3x3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Pattern</span>
          </button>
        )}
        </div>

        {/* Forgot Password Link */}
        <button 
          onClick={handleSendResetOtp}
          className="text-sm font-semibold text-gray-400 hover:text-gray-800 transition-colors flex items-center gap-2"
        >
          Forgot Password? <span className="text-xs font-normal text-gray-300">(Reset via OTP)</span>
        </button>
      </div>
      </>
      )}
    </div>
  );
}
