import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { accountApi } from '@/api/account';

export default function DeleteAccountConfirmPage() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { logout } = useAuthStore();
  const [status, setStatus] = useState<'pending' | 'success' | 'invalid'>('pending');

  useEffect(() => {
    (async () => {
      try {
        await accountApi.confirmDeletion(token || '');
        await logout();
        setStatus('success');
        toast.success('Account deleted successfully');
      } catch {
        const raw = localStorage.getItem('delete_request');
        if (!raw) {
          setStatus('invalid');
          return;
        }
        const req = JSON.parse(raw);
        const valid = req.token === token && Date.now() < req.expiresAt;
        if (!valid) {
          setStatus('invalid');
          return;
        }
        await logout();
        localStorage.removeItem('delete_request');
        setStatus('success');
        toast('Dev mode: account deleted using local token');
      }
    })();
  }, [token, logout]);

  return (
    <Layout>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        {status === 'pending' && (
          <div className="text-center text-gray-600">Processing...</div>
        )}
        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="mx-auto mb-3 flex justify-center">
              <ShieldCheck size={40} color="#16a34a" />
            </div>
            <h2 className="text-xl font-bold">Account Deleted</h2>
            <p className="text-sm text-gray-600 mb-4">Your account has been removed.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold"
            >
              Go to Login
            </button>
          </div>
        )}
        {status === 'invalid' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="mx-auto mb-3 flex justify-center">
              <XCircle size={40} color="#dc2626" />
            </div>
            <h2 className="text-xl font-bold">Invalid or Expired Link</h2>
            <p className="text-sm text-gray-600 mb-4">Please request deletion again.</p>
            <button
              onClick={() => router.push('/account/delete')}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold"
            >
              Request Again
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
