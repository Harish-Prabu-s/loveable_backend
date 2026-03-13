import { useState } from 'react';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import { Mail, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';

export default function EmailCapturePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [email, setEmail] = useState(localStorage.getItem('user_email') || '');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!email || !valid) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    (async () => {
      try {
        await authApi.setEmail(email);
        localStorage.setItem('user_email', email);
        toast.success('Email saved');
        router.replace('/home');
      } catch {
        localStorage.setItem('user_email', email);
        toast('Saved locally. Server update failed.');
        router.replace('/home');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-lg overflow-hidden border border-border">
            <div className="p-6 bg-gradient-to-r from-primary to-purple-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Mail size={24} color="#ffffff" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Add Your Email</h2>
                  <p className="text-xs opacity-80">For account recovery and confirmations</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-2 border-border rounded-xl p-3 mt-1 bg-background focus:border-primary focus:outline-none"
                />
                <div className="mt-2 text-xs flex items-center gap-2">
                  <ShieldCheck size={16} color={valid ? '#10b981' : '#71717a'} />
                  <span className={valid ? 'text-emerald-500' : 'text-muted-foreground'}>
                    {valid ? 'Looks good' : 'Enter a valid email'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!valid || loading}
                className={`w-full font-bold py-3 rounded-xl active:scale-95 transition flex items-center justify-center gap-2 ${valid && !loading ? 'bg-primary text-white' : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
              >
                <CheckCircle size={20} color={(valid && !loading) ? "#ffffff" : "#71717a"} />
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
