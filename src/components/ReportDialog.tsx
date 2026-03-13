import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import { reportsApi } from '../api/reports';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: number;
}

export default function ReportDialog({ isOpen, onClose, reportedUserId }: ReportDialogProps) {
  const [reason, setReason] = useState<'abuse' | 'nudity' | 'spam' | 'other' | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    setIsSubmitting(true);
    try {
      await reportsApi.createReport({
        reported_user_id: reportedUserId,
        reason: reason as any,
        description
      });
      toast.success('Report submitted. We will investigate.');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-red-50">
          <h3 className="font-bold text-red-600 flex items-center gap-2">
            <Flag className="w-5 h-5" /> Report User
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">Why are you reporting this user?</p>
          <div className="space-y-2">
            {[
              { id: 'abuse', label: 'Abuse / Harassment' },
              { id: 'nudity', label: 'Nudity / Inappropriate' },
              { id: 'spam', label: 'Spam / Scam' },
              { id: 'other', label: 'Other' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setReason(opt.id as any)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${reason === opt.id ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Additional details (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border rounded-xl text-sm focus:border-red-500 outline-none"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
