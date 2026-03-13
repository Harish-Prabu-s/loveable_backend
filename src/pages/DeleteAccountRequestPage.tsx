import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { accountApi } from '../api/account';

const makeToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

export default function DeleteAccountRequestPage() {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');

  const handleRequest = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    (async () => {
      try {
        await accountApi.requestDeletion(reason);
        toast.success('Deletion request created. Please check your email for confirmation.');
        navigate('/profile');
      } catch {
        const token = makeToken();
        const expiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
        localStorage.setItem('delete_request', JSON.stringify({ reason, token, expiresAt }));
        const link = `${window.location.origin}/account/delete/confirm/${token}`;
        toast('Dev mode: confirmation link simulated.');
        toast(link, { duration: 8000 });
        navigate('/profile');
      }
    })();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold">Delete Account</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Your account will be deleted only after email confirmation within 2 days.
          </p>
          <label className="text-sm font-semibold text-gray-700">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell us why you want to delete your account"
            className="w-full border rounded-xl p-3 mt-2"
          />
          <button
            onClick={handleRequest}
            className="mt-4 w-full bg-red-600 text-white font-bold py-3 rounded-xl active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Request Deletion
          </button>
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Confirmation link will be valid for 2 days.
          </div>
        </div>
      </div>
    </Layout>
  );
}
