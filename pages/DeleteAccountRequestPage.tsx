import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountApi } from '@/api/account';

const makeToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

export default function DeleteAccountRequestPage() {
  const router = useRouter();
  const [reason, setReason] = useState('');

  const handleRequest = () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }
    (async () => {
      try {
        await accountApi.requestDeletion(reason);
        Alert.alert('Success', 'Deletion request created. Please check your email for confirmation.');
        router.push('/profile');
      } catch {
        const token = makeToken();
        const expiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
        await AsyncStorage.setItem('delete_request', JSON.stringify({ reason, token, expiresAt }));
        const link = `http://localhost:8000/account/delete/confirm/${token}`;
        Alert.alert('Dev Mode', `Confirmation link simulated:\n${link}`);
        router.push('/profile');
      }
    })();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} color="#ef4444" />
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
            <Trash2 size={20} color="#ffffff" />
            Request Deletion
          </button>
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
            <CheckCircle size={12} color="#22c55e" />
            Confirmation link will be valid for 2 days.
          </div>
        </div>
      </div>
    </Layout>
  );
}
