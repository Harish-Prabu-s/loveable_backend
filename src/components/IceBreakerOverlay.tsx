import React, { useEffect, useState, useCallback } from 'react';
import { X, Shuffle, SkipForward } from 'lucide-react';
import { gamesApi } from '@/api/games';
import type { IcebreakerResponse } from '@/api/games';
import { useAuthStore } from '@/store/authStore';

type Props = {
  onClose: () => void;
};

type GameKind = 'truth_or_dare' | 'guess_emotion' | 'rapid_fire' | 'guess_sound' | 'emoji_story' | 'would_you_rather' | 'two_truths_one_lie' | 'guess_movie_song' | 'compliment_challenge' | 'role_play';

const TYPES: { key: GameKind; label: string }[] = [
  { key: 'truth_or_dare', label: 'Truth or Dare' },
  { key: 'guess_emotion', label: 'Guess Emotion' },
  { key: 'rapid_fire', label: 'Rapid Fire' },
  { key: 'guess_sound', label: 'Guess Sound' },
  { key: 'emoji_story', label: 'Emoji Story' },
  { key: 'would_you_rather', label: 'Would You Rather' },
  { key: 'two_truths_one_lie', label: 'Two Truths & One Lie' },
  { key: 'guess_movie_song', label: 'Guess Movie/Song' },
  { key: 'compliment_challenge', label: 'Compliment Challenge' },
  { key: 'role_play', label: 'Role Play' },
];

export default function IceBreakerOverlay({ onClose }: Props) {
  const { user } = useAuthStore();
  const isFemale = user?.gender === 'F';
  const [kind, setKind] = useState<GameKind>('truth_or_dare');
  const [data, setData] = useState<IcebreakerResponse | null>(null);
  const [skipCount, setSkipCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await gamesApi.getIcebreaker(kind);
      setData(d);
    } catch (e) {
      setData(null);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-semibold">Ice-Breaker Games</h3>
          <button onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setKind(t.key)}
                className={`px-3 py-1 rounded text-sm ${kind===t.key ? 'bg-primary text-white' : 'bg-gray-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="border rounded p-4 bg-gray-50 min-h-[140px]">
            {!data ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <RenderData data={data} />
            )}
          </div>

          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-gray-600">
              {isFemale ? "Free Unlimited Skips ✨" : `Extra skips use coins. Standard skips left: ${Math.max(0, 3 - skipCount)}`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSkipCount(s=>s+1); void load(); }}
                className="px-3 py-2 bg-gray-200 rounded inline-flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4" /> Skip
              </button>
              <button
                onClick={() => void load()}
                className="px-3 py-2 bg-primary text-white rounded inline-flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" /> Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RenderData({ data }: { data: IcebreakerResponse }) {
  if (data.type === 'rapid_fire') {
    return (
      <div>
        <p className="text-sm text-gray-700 mb-2">Answer in 5 seconds:</p>
        <ul className="list-disc list-inside text-sm">
          {data.questions.map((q: string, i: number) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (data.type === 'emoji_story') {
    return <div className="text-2xl">{data.emojis.join(' ')}</div>;
  }
  if (data.type === 'guess_emotion') {
    return <div className="text-xl font-bold capitalize">{data.prompt}</div>;
  }
  if (data.type === 'guess_sound') {
    return <div className="text-xl font-bold">{data.sound}</div>;
  }
  if (data.type === 'would_you_rather') {
    return <div className="text-lg">{data.question}</div>;
  }
  if (data.type === 'two_truths_one_lie') {
    return <div className="text-sm">{data.instructions}</div>;
  }
  if (data.type === 'compliment_challenge') {
    return <div className="text-lg">{data.prompt}</div>;
  }
  if (data.type === 'role_play') {
    return <div className="text-lg">{data.scene}</div>;
  }
  if (data.type === 'truth_or_dare' || data.type === 'guess_movie_song') {
    return <div className="text-lg">{data.prompt}</div>;
  }
  return <div className="text-lg">{data.prompt}</div>;
}
