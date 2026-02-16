import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Globe2, Check } from 'lucide-react';
import { notify } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
];

export default function LanguageSelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<string | null>(localStorage.getItem('preferred_language'));

  const handleContinue = async () => {
    if (!selected) {
      notify('error', 'LANGUAGE_REQUIRED');
      return;
    }
    
    try {
      await authApi.setLanguage(selected);
      localStorage.setItem('preferred_language', selected);
      notify('success', 'LANGUAGE_SAVED');
      navigate('/email', { replace: true });
    } catch (error) {
      console.error('Failed to save language:', error);
      // Fallback to local storage only if API fails, or show error?
      // For onboarding flow, maybe better to proceed even if API fails?
      // Let's decide to proceed but log error.
      localStorage.setItem('preferred_language', selected);
      navigate('/email', { replace: true });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full mb-3">
              <Globe2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">Choose Your Language</h2>
            <p className="text-muted-foreground text-sm">We will connect you with native speakers</p>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 space-y-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition ${
                  selected === lang.code 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <span className="font-semibold text-foreground">{lang.label}</span>
                {selected === lang.code && (
                  <span className="bg-primary text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleContinue}
            className="mt-6 w-full bg-primary text-white font-bold py-3 rounded-xl active:scale-95 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </Layout>
  );
}
