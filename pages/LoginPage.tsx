import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Phone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api/auth';
import apiClient from '../api/client';
import { auth } from '../lib/firebase';

interface SignInWithPhoneResult {
  verificationId?: string;
}

const LoginPage = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const phoneNumberRef = useRef('');
  const [isEmailLogin, setIsEmailLogin] = useState(false);

  useEffect(() => {
    // Clear any existing auth state on mount
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }, []);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Test Connectivity before proceeding
    try {
      await apiClient.get('/health/');
      console.log('Health check passed');
    } catch (healthError: any) {
      console.error('Health Check Failed:', healthError);
      toast.error(`Network Error: Cannot connect to server. Details: ${healthError.message}`);
      // Optional: Continue anyway if you want, but this warns the user
    }

    if (isEmailLogin) {
      if (!phoneNumber || !phoneNumber.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
    } else {
      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }

    setLoading(true);
    // For email, we don't format as phone
    const formattedInput = isEmailLogin ? phoneNumber : (phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`);
    phoneNumberRef.current = formattedInput;

    try {
      if (isEmailLogin) {
        console.log('Sending Email OTP to:', formattedInput);
        const response = await authApi.sendOTPEmail(formattedInput);
        console.log('Email OTP Response:', response);
        if (response.otp) {
          toast.success(`OTP: ${response.otp}`, { duration: 10000 }); // Show OTP in popup for dev
        } else {
          toast.success('OTP sent successfully');
        }

        router.push({
          pathname: '/otp',
          params: {
            phoneNumber: formattedInput,
            provider: 'email'
          }
        });
      } else {
        // Internal OTP / Custom Auth Flow
        console.log('Sending Internal OTP to:', formattedInput);

        try {
          const response = await authApi.sendOTP({
            phone_number: formattedInput
          });
          console.log('Internal OTP Response:', response);

          setLoading(false);

          // Mock OTP Display (Always show if present, using alert for APK visibility)
          if (response.otp) {
            // Use window.alert for reliability on Android WebView
            window.alert(`Mock OTP: ${response.otp}`);
            toast.success(`OTP: ${response.otp}`, { duration: 10000 });
          } else if (response.message) {
            toast.success(response.message);
            // Also alert if it's Twilio Verify, so user knows what happened
            if (response.message.includes('Twilio Verify')) {
              // window.alert(response.message); // Optional: Don't annoy if real SMS
            }
          }

          router.push({
            pathname: '/otp',
            params: {
              phoneNumber: formattedInput,
              provider: 'backend', // OTPScreen handles this via verifyOTP
              otp: response.otp ? String(response.otp) : undefined // Pass to OTP screen for auto-fill if needed
            }
          });

        } catch (error: any) {
          console.error('Internal OTP Send Error:', error);
          setLoading(false);
          const errorMsg = error.response?.data?.error || error.message || 'Failed to send OTP';

          // Explicit Alert for APK Debugging
          window.alert(`Error Sending OTP: ${errorMsg}`);

          toast.error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Send OTP Error:', error);
      toast.error(error.message || 'Failed to send OTP');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-white/40">
            {isEmailLogin ? 'Enter your email to continue' : 'Enter your phone number to continue'}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60 ml-1">
                {isEmailLogin ? 'Email Address' : 'Phone Number'}
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-black/40 rounded-2xl border border-white/10 focus-within:border-white/20 transition-colors flex items-center">
                  <div className="pl-4 text-white/40">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type={isEmailLogin ? "email" : "tel"}
                    placeholder={isEmailLogin ? "john@example.com" : "+91 98765 43210"}
                    className="w-full bg-transparent border-none py-4 px-4 text-white placeholder:text-white/20 focus:ring-0 text-lg"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 rounded-2xl text-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Send Code
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black/0 text-white/40 backdrop-blur-xl">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEmailLogin(!isEmailLogin)}
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
          >
            {isEmailLogin ? 'Use Phone Number' : 'Use Email Address'}
          </button>
        </div>

        <p className="text-center text-xs text-white/20">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
