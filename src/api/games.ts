import apiClient from './client';
type IcebreakerKind =
  | "truth_or_dare"
  | "guess_emotion"
  | "rapid_fire"
  | "guess_sound"
  | "emoji_story"
  | "would_you_rather"
  | "two_truths_one_lie"
  | "guess_movie_song"
  | "compliment_challenge"
  | "role_play";
type RapidFireData = { type: "rapid_fire"; questions: string[] };
type EmojiStoryData = { type: "emoji_story"; emojis: string[] };
type GuessEmotionData = { type: "guess_emotion"; prompt: string };
type GuessSoundData = { type: "guess_sound"; sound: string };
type WouldYouRatherData = { type: "would_you_rather"; question: string };
type TwoTruthsOneLieData = { type: "two_truths_one_lie"; instructions: string };
type ComplimentChallengeData = { type: "compliment_challenge"; prompt: string };
type RolePlayData = { type: "role_play"; scene: string };
type GenericPromptData = { type: 'truth_or_dare' | 'guess_movie_song'; prompt: string };
export type IcebreakerResponse =
  | RapidFireData
  | EmojiStoryData
  | GuessEmotionData
  | GuessSoundData
  | WouldYouRatherData
  | TwoTruthsOneLieData
  | ComplimentChallengeData
  | RolePlayData
  | GenericPromptData;

export interface Game {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  is_active: boolean;
}

export const gamesApi = {
  listGames: async (): Promise<Game[]> => {
    const res = await apiClient.get('/games/');
    return res.data;
  },
  getIcebreaker: async (kind: IcebreakerKind): Promise<IcebreakerResponse> => {
    const res = await apiClient.get(`/games/icebreaker/${encodeURIComponent(kind)}/`);
    return res.data;
  },
};
