import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { authApi } from '../api/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { PhoneAuthProvider } from 'firebase/auth';
import type { AuthResponse } from '../types';

export default function OTPScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, setCredentials } = useAuthStore();
  const { phoneNumber = '', verificationId, provider, otp: otpFromState, sessionId } = location.state || {};
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
      }).catch(err => {
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
      if (provider === 'msg91') {
          console.log('Verifying MSG91 OTP...');
          const response: AuthResponse = await authApi.verifyOTPMSG91({
              phone_number: phoneNumber,
              otp: otpCode
          });
          console.log('MSG91 Verify Response:', response);

          const { access_token, refresh_token, user, is_new_user } = response;

          setCredentials(user, access_token, refresh_token);
          if (user?.language) {
              localStorage.setItem('preferred_language', user.language);
          }
          if (user?.email) {
              localStorage.setItem('user_email', user.email);
          }
          toast.success('Login successful!');
          if (user?.is_superuser) {
              navigate('/admin');
          } else if (is_new_user) {
              navigate('/name');
          } else {
              navigate('/home');
          }
      } else if (provider === 'backend') {
          console.log('Verifying Backend OTP...');
          const response = await authApi.verifyOTP({
              phone_number: phoneNumber,
              otp_code: otpCode
          });
          console.log('Backend Verify Response:', response);

          const { access_token, refresh_token, user, is_new_user } = response;

          setCredentials(user, access_token, refresh_token);
          if (user?.language) {
              localStorage.setItem('preferred_language', user.language);
          }
          if (user?.email) {
              localStorage.setItem('user_email', user.email);
          }
          toast.success('Login successful!');
          if (user?.is_superuser) {
              navigate('/admin');
          } else if (is_new_user) {
              navigate('/name');
          } else {
              navigate('/home');
          }
      } else if (provider === '2factor') {
          console.log('Verifying 2Factor OTP...');
          if (!sessionId) {
              throw new Error('Session ID missing for 2Factor Auth');
          }
          const response = await authApi.verifyOTP2Factor({
              phone_number: phoneNumber,
              session_id: sessionId,
              otp: otpCode
          });
          console.log('2Factor Verify Response:', response);

          const { access_token, refresh_token, user, is_new_user } = response;

          setCredentials(user, access_token, refresh_token);
          if (user?.language) {
              localStorage.setItem('preferred_language', user.language);
          }
          if (user?.email) {
              localStorage.setItem('user_email', user.email);
          }
          toast.success('Login successful!');
          if (user?.is_superuser) {
              navigate('/admin');
          } else if (is_new_user) {
              navigate('/name');
          } else {
              navigate('/home');
          }
      } else if (provider === 'email') {
          console.log('Verifying Email OTP...');
          const response = await authApi.verifyOTPEmail({
              email: phoneNumber, // Reuse phoneNumber field for email
              otp: otpCode
          });
          console.log('Email Verify Response:', response);

          const { access_token, refresh_token, user, is_new_user } = response;

          setCredentials(user, access_token, refresh_token);
          if (user?.language) {
              localStorage.setItem('preferred_language', user.language);
          }
          if (user?.email) {
              localStorage.setItem('user_email', user.email);
          }
          toast.success('Login successful!');
          if (user?.is_superuser) {
              navigate('/admin');
          } else if (is_new_user) {
              navigate('/name');
          } else {
              navigate('/home');
          }
      } else {
          // Default to Firebase
          if (!verificationId) {
            throw new Error('Verification ID missing. Please resend OTP.');
          }

          // 3️⃣ User enters OTP (otpCode)
          // 4️⃣ Firebase verifies OTP
          console.log('Verifying code with Firebase Native Plugin...');
          await FirebaseAuthentication.confirmVerificationCode({
            verificationId: verificationId,
            verificationCode: otpCode
          });
          
          console.log('Firebase verification successful');
          
          // 5️⃣ Firebase returns ID Token
          const tokenResult = await FirebaseAuthentication.getIdToken();
          const token = tokenResult?.token;
          
          if (!token) {
            throw new Error('Failed to retrieve ID token from Firebase');
          }

          // 6️⃣ Verify Firebase ID Token (Send to Backend)
          // 7️⃣ Create/Login user (Backend)
          // 8️⃣ Issue your own JWT/session (Backend response)
          const response = await authApi.loginWithFirebase({
            phone_number: phoneNumber,
            id_token: token
          });
          
          const { access_token, refresh_token, user, is_new_user } = response;

          setCredentials(user, access_token, refresh_token);
          if (user?.language) {
              localStorage.setItem('preferred_language', user.language);
          }
          if (user?.email) {
              localStorage.setItem('user_email', user.email);
          }
          toast.success('Login successful!');
          if (user?.is_superuser) {
            navigate('/admin');
          } else if (is_new_user) {
            navigate('/name');
          } else {
            navigate('/home');
          }
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
      navigate('/login');
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
          onClick={() => navigate('/login')}
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
                className={`w-12 h-14 text-center text-2xl font-bold bg-black/20 border rounded-xl focus:outline-none transition-all ${
                    isError 
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
              className={`font-semibold transition-colors ${
                  resendTimer > 0 ? 'text-white/40 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300'
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
