import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { authApi } from '@/api/auth';
import { getAuth, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse } from '@/types';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phoneNumber?: string; verificationId?: string; provider?: string; otp?: string; sessionId?: string }>();
  const { phoneNumber = '', verificationId, provider, otp: otpFromState, sessionId } = params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Timer countdown
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  useEffect(() => {
    // Auto-submit when filled
    if (otp.every(digit => digit !== '') && !loading && !isError) {
      handleVerify();
    }
  }, [otp]);

  useEffect(() => {
    // Auto-fill from state (Dev Mode)
    if (otpFromState && typeof otpFromState === 'string' && otpFromState.length === 6) {
      setOtp(otpFromState.split(''));
      toast.success('OTP Auto-filled (Dev Mode)');
    }

    // WebOTP API
    if ('OTPCredential' in window) {
      const ac = new AbortController();

      // @ts-ignore - WebOTP API is experimental and not in TypeScript types yet
      (navigator.credentials.get as any)({
        otp: { transport: ['sms'] },
        signal: ac.signal
      }).then((cred: any) => {
        if (cred && cred.code) {
          const code = cred.code;
          setOtp(code.split('').slice(0, 6));
          toast.success('OTP Auto-filled!');
        }
      }).catch((err: any) => {
        console.log('WebOTP Error:', err);
      });

      return () => {
        ac.abort();
      };
    }

    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    setIsError(false); // Clear error on typing
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      setIsError(false);
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setIsError(false);
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6 && /^\d$/.test(char)) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);
    inputRefs.current[5]?.focus();
  };

  const { login, dispatch } = useAuth();

  // Removed setCredentials from authStore

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete OTP');
      return;
    }

    if (!phoneNumber) {
      toast.error('Phone number missing. Please restart login.');
      return;
    }

    setLoading(true);
    try {
      let responseBody: any = null;

      if (provider === 'msg91') {
        console.log('Verifying MSG91 OTP...');
        responseBody = await authApi.verifyOTPMSG91({
          phone_number: phoneNumber,
          otp: otpCode
        });
      } else if (provider === 'backend') {
        console.log('Verifying Backend OTP...');
        responseBody = await authApi.verifyOTP({
          phone_number: phoneNumber,
          otp_code: otpCode
        });
      } else if (provider === '2factor') {
        console.log('Verifying 2Factor OTP...');
        if (!sessionId) {
          throw new Error('Session ID missing for 2Factor Auth');
        }
        responseBody = await authApi.verifyOTP2Factor({
          phone_number: phoneNumber,
          session_id: sessionId,
          otp: otpCode
        });
      } else if (provider === 'email') {
        console.log('Verifying Email OTP...');
        responseBody = await authApi.verifyOTPEmail({
          email: phoneNumber, // Reuse phoneNumber field for email
          otp: otpCode
        });
      } else {
        // Default to Firebase
        if (!verificationId) {
          throw new Error('Verification ID missing. Please resend OTP.');
        }

        console.log('Verifying code with Firebase Web SDK...');
        const auth = getAuth();
        const credential = PhoneAuthProvider.credential(verificationId, otpCode);
        const userCredential = await signInWithCredential(auth, credential);

        console.log('Firebase verification successful');
        const token = await userCredential.user.getIdToken();

        if (!token) {
          throw new Error('Failed to retrieve ID token from Firebase');
        }

        responseBody = await authApi.loginWithFirebase({
          phone_number: phoneNumber,
          id_token: token
        });
      }

      console.log('Verify Response:', responseBody);
      const { access_token, token, refresh_token, user, is_new_user, temp_token } = responseBody;
      const finalToken = access_token || token;

      if (is_new_user === true || String(is_new_user).toLowerCase() === 'true') {
        // It's a new user, they might not have a full token
        const tempToken = temp_token || finalToken || '';
        await AsyncStorage.setItem('temp_token', tempToken);
        // Setting temp_token allows access to onboarding in AuthGate
        dispatch({ type: 'SET_TEMP_TOKEN', payload: tempToken });
        router.push('/name' as any);
      } else {
        if (!finalToken) throw new Error("Backend did not return a valid auth token.");
        toast.success('Login successful!');
        // use sync login function to securely store credentials before redirect
        await login(finalToken, user, refresh_token);
      }

    } catch (error: any) {
      console.error('Verify OTP error:', error);
      const errorMessage = error.message || 'Failed to verify OTP';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setResendTimer(30);
    router.push('/login' as any);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 relative overflow-hidden items-center justify-center">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-pink-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <button
          onClick={() => router.push('/login' as any)}
          className="mb-6 flex items-center text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Login
        </button>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 rounded-2xl mb-4">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Code</h2>
            <p className="text-white/60">
              We sent a code to <span className="text-white font-medium">{phoneNumber}</span>
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-12 h-14 text-center text-2xl font-bold bg-black/20 border rounded-xl focus:outline-none transition-all ${isError
                  ? 'border-red-500/50 text-red-400'
                  : 'border-white/10 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                  }`}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="w-full btn-primary py-4 rounded-xl font-bold shadow-lg shadow-purple-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </div>
            ) : 'Verify Code'}
          </button>

          <p className="text-sm text-center mt-6">
            Didn't receive code?{' '}
            <button
              onClick={handleResend}
              disabled={resendTimer > 0}
              className={`font-semibold transition-colors ${resendTimer > 0 ? 'text-white/40 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300'
                }`}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
