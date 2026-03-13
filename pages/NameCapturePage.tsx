import { useState } from 'react';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import { User, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

export default function NameCapturePage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [name, setName] = useState('');
  const valid = name.length >= 2;
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name || !valid) {
      toast.error('Please enter a valid name (min 2 characters)');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ display_name: name });
      toast.success('Name saved');
      router.replace('/gender');
    } catch (error) {
      console.error('Failed to save name:', error);
      toast.error('Failed to save name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-lg overflow-hidden border border-border">
            <div className="p-6 bg-gradient-to-r from-primary to-purple-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">What's your name?</h2>
                  <p className="text-xs opacity-80">Let others know what to call you</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border-2 border-border rounded-xl p-3 mt-1 bg-background focus:border-primary focus:outline-none"
                />
                <div className="mt-2 text-xs flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${valid ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`${valid ? 'text-green-600' : 'text-gray-500'}`}>{valid ? 'Looks good' : 'Minimum 2 characters'}</span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!valid || loading}
                className={`w-full font-bold py-3 rounded-xl active:scale-95 transition flex items-center justify-center gap-2 ${valid && !loading ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
              >
                <CheckCircle className="w-5 h-5" />
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
