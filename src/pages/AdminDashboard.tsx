import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

type AdminUserRow = {
  id: number;
  name: string;
  phone_number: string;
  video_call_count: number;
  audio_call_count: number;
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const isAdmin = !!user?.is_superuser;
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const res = await apiClient.get('/admin/users/', { params: { q, date, page } });
    setRows(res.data.results || []);
    setCount(res.data.count || 0);
  }, [q, date, page, isAdmin]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed', error);
      alert('Failed to download. Please check if data exists.');
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      {!isAdmin && <Navigate to="/home" replace />}
      {isAdmin && (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Admin Activity Overview</h1>
        <div className="flex gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name/phone/id" className="border rounded px-3 py-2 flex-1" />
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="border rounded px-3 py-2" />
          <button onClick={load} className="px-4 py-2 bg-primary text-white rounded">Search</button>
        </div>
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Video Calls</th>
                <th className="p-3">Audio Calls</th>
                <th className="p-3">Chat Images (PDF)</th>
                <th className="p-3">Voice Messages (PDF)</th>
                <th className="p-3">Stories (PDF)</th>
                <th className="p-3">Conversation (PDF)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.phone_number}</td>
                  <td className="p-3">{r.video_call_count}</td>
                  <td className="p-3">{r.audio_call_count}</td>
                  <td className="p-3">
                    <button 
                      className="text-blue-600 underline hover:text-blue-800" 
                      onClick={() => handleDownload(`/admin/export/chat-images/${r.id}/`, `chat_images_${r.id}.pdf`)}
                    >
                      Download
                    </button>
                  </td>
                  <td className="p-3">
                    <button 
                      className="text-blue-600 underline hover:text-blue-800" 
                      onClick={() => handleDownload(`/admin/export/voice-messages/${r.id}/`, `voice_messages_${r.id}.pdf`)}
                    >
                      Download
                    </button>
                  </td>
                  <td className="p-3">
                    <button 
                      className="text-blue-600 underline hover:text-blue-800" 
                      onClick={() => handleDownload(`/admin/export/stories/${r.id}/`, `stories_${r.id}.pdf`)}
                    >
                      Download
                    </button>
                  </td>
                  <td className="p-3">
                    <button 
                      className="text-blue-600 underline hover:text-blue-800" 
                      onClick={() => handleDownload(`/admin/export/chat-conversation/${r.id}/`, `chat_conversation_${r.id}.pdf`)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button disabled={page<=1} onClick={() => { setPage(p => Math.max(1, p-1)); load(); }} className="px-3 py-2 border rounded">Prev</button>
          <span>Page {page} of {Math.ceil(count / 10) || 1}</span>
          <button disabled={page*10>=count} onClick={() => { setPage(p => p+1); load(); }} className="px-3 py-2 border rounded">Next</button>
        </div>
      </div>
    </Layout>
      )}
    </>
  );
}
