import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { User, Users, UserCircle } from 'lucide-react';
import type { Gender } from '@/types';

export default function GenderSelectionPage() {
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const { selectGender, refreshUser, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const genders = [
    { value: 'M' as const, label: 'Male', icon: User, color: 'bg-blue-500' },
    { value: 'F' as const, label: 'Female', icon: Users, color: 'bg-pink-500' },
    { value: 'O' as const, label: 'Other', icon: UserCircle, color: 'bg-purple-500' },
  ];

  const handleSelect = async () => {
    if (!selectedGender) {
      toast.error('Please select your gender');
      return;
    }

    try {
      await selectGender(selectedGender);
      await refreshUser(); // safety sync

      toast.success('Gender saved successfully!');
      navigate('/language', { replace: true }); // next: language selection
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { gender?: string[]; error?: string } } };
      toast.error(
        axiosError?.response?.data?.gender?.[0] ||
          axiosError?.response?.data?.error ||
          'Failed to save gender'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Select Your Gender
          </h2>
          <p className="text-muted-foreground">
            This helps us match you with the right people
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 space-y-4">
          {genders.map((gender) => {
            const Icon = gender.icon;
            const isSelected = selectedGender === gender.value;

            return (
              <button
                key={gender.value}
                onClick={() => setSelectedGender(gender.value)}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div
                  className={`${gender.color} w-12 h-12 rounded-full flex items-center justify-center text-white`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {gender.label}
                </span>

                {isSelected && (
                  <div className="ml-auto w-5 h-5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}

          <button
            onClick={handleSelect}
            disabled={!selectedGender || isLoading}
            className={`w-full mt-6 py-3 rounded-xl font-semibold transition ${
              !selectedGender || isLoading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
