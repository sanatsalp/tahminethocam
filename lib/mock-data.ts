export type Role = "pending" | "user" | "admin" | "blocked";
export type MatchStatus = "open" | "closed" | "finished";
export type PredictionResult = "pending" | "won" | "lost";
export type TransactionType = "prediction" | "win" | "bonus" | "admin_grant" | "initial";

export interface SiteSettings {
  title: string;
  subtitle: string;
  logoEmoji: string;
  customLogoUrl?: string;
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
  match?: Match;
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
  avatarUrl?: string;
  text: string;
  created_at: string;
  pinned?: boolean;
}

// --------------- MOCK CREDENTIALS ---------------
export const MOCK_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  alpasha:     { password: "Alp0825", userId: "admin-1"  },
  alp_tennis:  { password: "user123",  userId: "user-1"   },
  zeynep_ace:  { password: "user123",  userId: "user-2"   },
  kaan_smash:  { password: "user123",  userId: "user-3"   },
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  title: "tahminethocam",
  subtitle: "ODTÜ Tahmin Platformu",
  logoEmoji: "🎾",
};

export const MOCK_USERS: Profile[] = [
  { id: "admin-1", username: "alpasha",     email: "admin@tahminethocam.com", role: "admin", credits: 999999, created_at: "2024-01-01T00:00:00Z" },
  { id: "user-1",  username: "alp_tennis",  email: "alp@example.com",        role: "user",  credits: 3450,   created_at: "2024-01-15T10:00:00Z" },
  { id: "user-2",  username: "zeynep_ace",  email: "zeynep@example.com",     role: "user",  credits: 5200,   created_at: "2024-01-20T10:00:00Z" },
  { id: "user-3",  username: "kaan_smash",  email: "kaan@example.com",       role: "user",  credits: 2100,   created_at: "2024-02-01T10:00:00Z" },
  { id: "user-4",  username: "selin_volley",email: "selin@example.com",      role: "user",  credits: 7800,   created_at: "2024-02-10T10:00:00Z" },
  { id: "user-5",  username: "mert_lob",    email: "mert@example.com",       role: "user",  credits: 4600,   created_at: "2024-02-15T10:00:00Z" },
  { id: "user-6",  username: "bekleyen_kullanici", email: "bekleyen@example.com", role: "pending", credits: 0, created_at: "2024-03-28T10:00:00Z" },
];

export const MOCK_MATCHES: Match[] = [
  { id: "match-1", title: "Çeyrek Final - A Grubu",  player_a: "Ahmet Yılmaz", player_b: "Burak Demir",   odds_a: 1.75, odds_b: 2.20, status: "open",     winner: null, tournament: "ODTÜ Open 2024",   scheduled_at: "2024-04-01T14:00:00Z" },
  { id: "match-2", title: "Çeyrek Final - B Grubu",  player_a: "Cem Arslan",   player_b: "Deniz Kaya",    odds_a: 1.50, odds_b: 2.60, status: "open",     winner: null, tournament: "ODTÜ Open 2024",   scheduled_at: "2024-04-01T16:00:00Z" },
  { id: "match-3", title: "Yarı Final",               player_a: "Emre Şahin",   player_b: "Furkan Güneş", odds_a: 2.10, odds_b: 1.80, status: "open",     winner: null, tournament: "ODTÜ Open 2024",   scheduled_at: "2024-04-03T15:00:00Z" },
  { id: "match-4", title: "Final",                    player_a: "Gökhan Tepe",  player_b: "Hakan Çelik",  odds_a: 1.90, odds_b: 1.95, status: "closed",   winner: null, tournament: "ODTÜ Open 2024",   scheduled_at: "2024-04-05T18:00:00Z" },
  { id: "match-5", title: "Grup Maçı - C Grubu",     player_a: "İbrahim Yurt", player_b: "Jale Öztürk",  odds_a: 1.60, odds_b: 2.40, status: "finished", winner: "A",  tournament: "ODTÜ Bahar Ligi",  scheduled_at: "2024-03-20T14:00:00Z" },
  { id: "match-6", title: "1. Tur - A Grubu",        player_a: "Kaan Yıldız",  player_b: "Leyla Çetin",  odds_a: 1.30, odds_b: 3.10, status: "open",     winner: null, tournament: "ODTÜ Bahar Ligi",  scheduled_at: "2024-04-07T13:00:00Z" },
];

export const INITIAL_PREDICTIONS: Prediction[] = [
  { id: "pred-1", user_id: "user-1", match_id: "match-1", choice: "A", amount: 500,  potential_win: 875, result: "pending", created_at: "2024-03-26T12:00:00Z", match: MOCK_MATCHES[0] },
  { id: "pred-2", user_id: "user-1", match_id: "match-5", choice: "A", amount: 300,  potential_win: 480, result: "won",     created_at: "2024-03-18T10:00:00Z", match: MOCK_MATCHES[4] },
  { id: "pred-3", user_id: "user-1", match_id: "match-4", choice: "B", amount: 200,  potential_win: 390, result: "lost",    created_at: "2024-03-26T14:00:00Z", match: MOCK_MATCHES[3] },
];

export const INITIAL_TRANSACTIONS: CreditTransaction[] = [
  { id: "tx-1", user_id: "user-1", amount: 1000,  type: "initial",     description: "Başlangıç kredisi",                    created_at: "2024-01-15T10:00:00Z" },
  { id: "tx-2", user_id: "user-1", amount: 200,   type: "bonus",       description: "Haftalık bonus",                        created_at: "2024-03-25T00:00:00Z" },
  { id: "tx-3", user_id: "user-1", amount: -500,  type: "prediction",  description: "Tahmin - Ahmet Yılmaz vs Burak Demir",  created_at: "2024-03-26T12:00:00Z" },
  { id: "tx-4", user_id: "user-1", amount: 480,   type: "win",         description: "Kazanç - İbrahim Yurt vs Jale Öztürk", created_at: "2024-03-20T18:00:00Z" },
  { id: "tx-5", user_id: "user-1", amount: -200,  type: "prediction",  description: "Tahmin - Gökhan Tepe vs Hakan Çelik",   created_at: "2024-03-26T14:00:00Z" },
  { id: "tx-6", user_id: "user-1", amount: 500,   type: "admin_grant", description: "Admin tarafından kredi eklendi",         created_at: "2024-02-20T10:00:00Z" },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  { id: "msg-1", user_id: "user-2", username: "zeynep_ace",  text: "Bugünkü maç çok heyecanlı olacak! 🎾",       created_at: "2024-03-29T08:00:00Z" },
  { id: "msg-2", user_id: "user-3", username: "kaan_smash",  text: "Ahmet Yılmaz'a tahmin yaptım, umarım kazanır", created_at: "2024-03-29T08:05:00Z" },
  { id: "msg-3", user_id: "user-1", username: "alp_tennis",  text: "Ben de! Oranlara göre biraz zayıf ama...",    created_at: "2024-03-29T08:10:00Z" },
  { id: "msg-4", user_id: "user-5", username: "mert_lob",    text: "Final maçında kim favoriniz?",                created_at: "2024-03-29T09:00:00Z" },
];
