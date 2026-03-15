// User Types
export type Gender = 'M' | 'F' | 'O';

export interface User {
  id: number;
  phone_number: string;
  gender: Gender | null;
  is_verified: boolean;
  is_online: boolean;
  is_superuser?: boolean;
  date_joined: string;
  last_login: string | null;
  display_name?: string;
  email?: string;
  photo?: string | null;
  language?: string;
  bio?: string;
  interests?: string[];
}

export interface Profile {
  id: number;
  user: number;
  display_name: string;
  bio: string;
  photo: string | null;
  interests: string[];
  age: number | null;
  location: string | null;
  is_verified: boolean;
  gender?: Gender | null;
  created_at: string;
  updated_at: string;
  language?: string;
  is_following?: boolean;
  followers_count?: number;
  following_count?: number;
  is_online?: boolean;
  is_busy?: boolean;
  friend_request_status?: {
    status: 'pending' | 'accepted' | 'rejected';
    direction: 'sent' | 'received';
    id: number;
  } | null;
}

// Auth Types
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  is_new_user: boolean;
}

export interface OTPRequest {
  phone_number: string;
}

export interface OTPVerify {
  phone_number: string;
  otp_code: string;
}

export interface GenderSelection {
  gender: Gender;
}

// Call Types
export type CallType = 'audio' | 'video';

export interface Room {
  id: number;
  caller: number;
  receiver: number;
  call_type: CallType;
  status: 'pending' | 'active' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  coins_spent: number;
  created_at: string;
}

export interface Call {
  id: number;
  room: number;
  caller: User;
  receiver: User;
  call_type: CallType;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  coins_spent: number;
  rating: number | null;
  review: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  room: number;
  sender: number;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'voice' | 'game_invite' | 'post_share' | 'reel_share';
  media_url?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface Story {
  id: number;
  user: number;
  image_url: string;
  timestamp: string;
  user_display_name?: string;
  user_avatar?: string;
  view_count?: number;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_owner?: boolean;
}

export interface Contact {
  id: number;
  username: string;
  display_name: string;
  photo: string | null;
  last_message: string;
  last_message_type: string;
  last_timestamp: string;
}

export interface StoryView {
  id: number;
  viewer: number;
  viewer_name: string;
  viewer_avatar: string | null;
  viewed_at: string;
}

// Wallet Types
export interface Wallet {
  id: number;
  user: number;
  coin_balance: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
  has_purchased?: boolean;
}

export interface CoinTransaction {
  id: number;
  wallet: number;
  type: 'credit' | 'debit';
  transaction_type: 'purchase' | 'spent' | 'earned' | 'withdrawal';
  amount: number;
  description: string;
  created_at: string;
}

export interface Payment {
  id: number;
  user: number;
  amount: number;
  currency: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  status: 'pending' | 'completed' | 'failed';
  coins_added: number;
  created_at: string;
}

export interface Withdrawal {
  id: number;
  user: number;
  amount: number;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// Gamification Types
export interface UserLevel {
  id: number;
  user: number;
  xp: number;
  level: number;
  badges: Badge[];
  updated_at: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at: string | null;
}

export interface DailyReward {
  id: number;
  user: number;
  day: number;
  xp_reward: number;
  coin_reward: number;
  claimed_at: string | null;
  streak: number;
}

export interface LeaderboardEntry {
  user: User;
  profile: Profile;
  xp: number;
  level: number;
  rank: number;
}

export interface Referral {
  id: number;
  referrer: number;
  referred: number;
  reward_claimed: boolean;
  created_at: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  error?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}
