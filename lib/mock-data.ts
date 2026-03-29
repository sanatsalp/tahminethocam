export type Role = "pending" | "user" | "admin" | "blocked";
export type MatchStatus = "open" | "closed" | "finished";
export type PredictionResult = "pending" | "won" | "lost";
export type TransactionType = "prediction" | "win" | "bonus" | "admin_grant" | "initial";

export interface SiteSettings {
  title: string;
  subtitle: string;
  logoEmoji: string;
  customLogoUrl?: string;
  chatEnabled?: boolean;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: Role;
  credits: number;
  created_at: string;
  avatarUrl?: string;
  chatBlocked?: boolean;
  is_approved?: boolean;
  is_blocked?: boolean;
}

export interface Match {
  id: string;
  title: string;
  player_a: string;
  player_b: string;
  player_a_img?: string;
  player_b_img?: string;
  odds_a: number;
  odds_b: number;
  status: MatchStatus;
  winner: "A" | "B" | null;
  tournament: string;
  scheduled_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  choice: "A" | "B";
  amount: number;
  potential_win: number;
  result: PredictionResult;
  created_at: string;
  match?: Match; // Used in UI joins
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  avatarUrl?: string; // Mapped from DB avatar_url
  text: string;
  created_at: string;
  pinned?: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  title: "tahminethocam",
  subtitle: "ODTÜ Tahmin Platformu",
  logoEmoji: "🎾",
  chatEnabled: true,
};
