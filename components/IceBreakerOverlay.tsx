import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

function RenderData({ data }: { data: IcebreakerResponse }) {
  if (data.type === 'rapid_fire') {
    return (
      <View>
        <Text style={styles.renderSubtitle}>Answer in 5 seconds:</Text>
        {data.questions.map((q: string, i: number) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={styles.renderText}>{q}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (data.type === 'emoji_story') {
    return <Text style={styles.renderLargeText}>{data.emojis.join(' ')}</Text>;
  }
  if (data.type === 'guess_emotion') {
    return <Text style={[styles.renderBoldText, { textTransform: 'capitalize' }]}>{data.prompt}</Text>;
  }
  if (data.type === 'guess_sound') {
    return <Text style={styles.renderBoldText}>{data.sound}</Text>;
  }
  if (data.type === 'would_you_rather') {
    return <Text style={styles.renderMediumText}>{data.question}</Text>;
  }
  if (data.type === 'two_truths_one_lie') {
    return <Text style={styles.renderSmallText}>{data.instructions}</Text>;
  }
  if (data.type === 'compliment_challenge') {
    return <Text style={styles.renderMediumText}>{data.prompt}</Text>;
  }
  if (data.type === 'role_play') {
    return <Text style={styles.renderMediumText}>{data.scene}</Text>;
  }
  if (data.type === 'truth_or_dare' || data.type === 'guess_movie_song') {
    return <Text style={styles.renderMediumText}>{data.prompt}</Text>;
  }
  return <Text style={styles.renderMediumText}>{data.prompt}</Text>;
}

export default function IceBreakerOverlay({ onClose }: Props) {
  const { user } = useAuthStore();
  const isFemale = user?.gender === 'F';
  const [kind, setKind] = useState<GameKind>('truth_or_dare');
  const [data, setData] = useState<IcebreakerResponse | null>(null);
  const [skipCount, setSkipCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await gamesApi.getIcebreaker(kind);
      setData(d);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ice-Breaker Games</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Game Types */}
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typesScroll}
                style={styles.typesContainer}
              >
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeBtn, kind === t.key && styles.typeBtnActive]}
                    onPress={() => setKind(t.key)}
                  >
                    <Text style={[styles.typeBtnText, kind === t.key && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Game Data Area */}
            <View style={styles.dataArea}>
              {loading || !data ? (
                <View style={styles.loadingContainer}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={styles.errorText}>Failed to load game</Text>
                  )}
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.dataScrollContent}>
                  <RenderData data={data} />
                </ScrollView>
              )}
            </View>

            {/* Footer / Controls */}
            <View style={styles.footer}>
              <Text style={styles.skipsText}>
                {isFemale ? "Free Unlimited Skips ✨" : `Standard skips left: ${Math.max(0, 3 - skipCount)}`}
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => { setSkipCount(s => s + 1); void load(); }}
                >
                  <MaterialCommunityIcons name="skip-forward" size={16} color="#334155" />
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => void load()}
                >
                  <MaterialCommunityIcons name="shuffle-variant" size={16} color="#FFFFFF" />
                  <Text style={styles.nextBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  typesContainer: {
    flexGrow: 0,
    marginBottom: 16,
  },
  typesScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  typeBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  typeBtnText: {
    fontSize: 14,
    color: '#475569',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  dataArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    minHeight: 140,
    maxHeight: 250,
  },
  dataScrollContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  skipsText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    paddingRight: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  skipBtnText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  nextBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // RenderData styles
  renderSubtitle: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 16,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    marginTop: 8,
    marginRight: 8,
  },
  renderText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  renderLargeText: {
    fontSize: 24,
    textAlign: 'center',
  },
  renderBoldText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  renderMediumText: {
    fontSize: 18,
    color: '#0F172A',
    lineHeight: 24,
    textAlign: 'center',
  },
  renderSmallText: {
    fontSize: 14,
    color: '#334155',
  }
});
