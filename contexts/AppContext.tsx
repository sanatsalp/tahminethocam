"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Profile, Match, Prediction, CreditTransaction, ChatMessage, SiteSettings,
  MOCK_CREDENTIALS, MOCK_USERS, MOCK_MATCHES,
  INITIAL_PREDICTIONS, INITIAL_TRANSACTIONS, INITIAL_CHAT_MESSAGES,
  DEFAULT_SITE_SETTINGS,
} from "@/lib/mock-data";

interface AppState {
  currentUser: Profile | null;
  users: Profile[];
  matches: Match[];
  predictions: Prediction[];
  transactions: CreditTransaction[];
  chatMessages: ChatMessage[];
  chatEnabled: boolean;
  siteSettings: SiteSettings;
}

interface AppContextType extends AppState {
  // Auth
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  register: (username: string, email: string, password: string) => { success: boolean; error?: string };
  // Profile
  setUserAvatar: (userId: string, dataUrl: string) => void;
  // Predictions
  placePrediction: (matchId: string, choice: "A" | "B", amount: number) => { success: boolean; error?: string };
  // Admin - Users
  approveUser: (userId: string) => void;
  rejectUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  addCredits: (userId: string, amount: number) => void;
  removeCredits: (userId: string, amount: number) => void;
  // Admin - Matches
  createMatch: (match: Omit<Match, "id" | "winner" | "status">) => void;
  closeMatch: (matchId: string, winner: "A" | "B") => void;
  deleteMatch: (matchId: string) => void;
  // Admin - Chat
  toggleChatEnabled: () => void;
  blockUserFromChat: (userId: string) => void;
  unblockUserFromChat: (userId: string) => void;
  deleteChatMessage: (id: string) => void;
  pinChatMessage: (id: string) => void;
  unpinChatMessage: (id: string) => void;
  // Admin - Settings
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  // Chat - User
  sendChatMessage: (text: string) => { success: boolean; error?: string };
  // Helpers
  getUserById: (id: string) => Profile | undefined;
  getUserPredictions: (userId: string) => Prediction[];
}

const AppContext = createContext<AppContextType | null>(null);
const STORAGE_KEY = "tahminethocam_v3";

function getInitialState(): AppState {
  return {
    currentUser: null,
    users: MOCK_USERS,
    matches: MOCK_MATCHES,
    predictions: INITIAL_PREDICTIONS,
    transactions: INITIAL_TRANSACTIONS,
    chatMessages: INITIAL_CHAT_MESSAGES,
    chatEnabled: true,
    siteSettings: DEFAULT_SITE_SETTINGS,
  };
}

function loadState(): AppState {
  if (typeof window === "undefined") return getInitialState();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields in future updates
      return {
        ...getInitialState(),
        ...parsed,
        siteSettings: { ...DEFAULT_SITE_SETTINGS, ...(parsed.siteSettings || {}) },
      };
    }
  } catch {}
  return getInitialState();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  const save = useCallback((next: AppState) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  // ── Auth ─────────────────────────────────────────────────
  const login = useCallback((username: string, password: string) => {
    const cred = MOCK_CREDENTIALS[username];
    if (!cred || cred.password !== password)
      return { success: false, error: "Kullanıcı adı veya şifre hatalı" };
    const user = state.users.find(u => u.id === cred.userId);
    if (!user) return { success: false, error: "Kullanıcı bulunamadı" };
    if (user.role === "pending") return { success: false, error: "Hesabınız henüz onaylanmamış. Admin onayını bekleyin." };
    if (user.role === "blocked") return { success: false, error: "Hesabınız engellenmiştir. Lütfen yönetici ile iletişime geçin." };
    save({ ...state, currentUser: user });
    return { success: true };
  }, [state, save]);

  const logout = useCallback(() => save({ ...state, currentUser: null }), [state, save]);

  const register = useCallback((username: string, email: string, password: string) => {
    if (!/^[a-z0-9_]+$/.test(username))
      return { success: false, error: "Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir" };
    if (state.users.some(u => u.username === username))
      return { success: false, error: "Bu kullanıcı adı zaten kullanımda" };
    if (state.users.some(u => u.email === email))
      return { success: false, error: "Bu e-posta zaten kullanımda" };
    const newUser: Profile = {
      id: `user-${Date.now()}`,
      username, email, role: "pending", credits: 0,
      created_at: new Date().toISOString(),
    };
    MOCK_CREDENTIALS[username] = { password, userId: newUser.id };
    save({ ...state, users: [...state.users, newUser] });
    return { success: true };
  }, [state, save]);

  // ── Profile ───────────────────────────────────────────────
  const setUserAvatar = useCallback((userId: string, dataUrl: string) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, avatarUrl: dataUrl } : u);
    const updatedCurrentUser = state.currentUser?.id === userId
      ? { ...state.currentUser, avatarUrl: dataUrl } : state.currentUser;
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser });
  }, [state, save]);

  // ── Predictions ───────────────────────────────────────────
  const placePrediction = useCallback((matchId: string, choice: "A" | "B", amount: number) => {
    if (!state.currentUser) return { success: false, error: "Giriş yapmanız gerekiyor" };
    const user = state.users.find(u => u.id === state.currentUser!.id)!;
    if (user.credits < amount) return { success: false, error: "Yetersiz kredi" };
    const match = state.matches.find(m => m.id === matchId);
    if (!match || match.status !== "open") return { success: false, error: "Bu maça tahmin yapılamaz" };
    if (state.predictions.find(p => p.user_id === user.id && p.match_id === matchId))
      return { success: false, error: "Bu maça zaten tahmin yaptınız" };
    const odds = choice === "A" ? match.odds_a : match.odds_b;
    const potentialWin = Math.round(amount * odds);
    const newPrediction: Prediction = {
      id: `pred-${Date.now()}`, user_id: user.id, match_id: matchId,
      choice, amount, potential_win: potentialWin, result: "pending",
      created_at: new Date().toISOString(), match,
    };
    const newTx: CreditTransaction = {
      id: `tx-${Date.now()}`, user_id: user.id, amount: -amount, type: "prediction",
      description: `Tahmin - ${match.player_a} vs ${match.player_b}`, created_at: new Date().toISOString(),
    };
    const updatedUsers = state.users.map(u => u.id === user.id ? { ...u, credits: u.credits - amount } : u);
    const updatedCurrentUser = { ...state.currentUser!, credits: state.currentUser!.credits - amount };
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser,
      predictions: [...state.predictions, newPrediction], transactions: [...state.transactions, newTx] });
    return { success: true };
  }, [state, save]);

  // ── Admin - Users ─────────────────────────────────────────
  const approveUser = useCallback((userId: string) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, role: "user" as const, credits: 1000 } : u);
    const newTx: CreditTransaction = { id: `tx-${Date.now()}`, user_id: userId, amount: 1000,
      type: "initial", description: "Başlangıç kredisi - Admin onayı", created_at: new Date().toISOString() };
    save({ ...state, users: updatedUsers, transactions: [...state.transactions, newTx] });
  }, [state, save]);

  const rejectUser = useCallback((userId: string) => {
    save({ ...state, users: state.users.filter(u => u.id !== userId) });
  }, [state, save]);

  const deleteUser = useCallback((userId: string) => {
    if (userId === state.currentUser?.id) return; // can't delete yourself
    const updatedUsers = state.users.filter(u => u.id !== userId);
    const updatedPredictions = state.predictions.filter(p => p.user_id !== userId);
    const updatedTransactions = state.transactions.filter(t => t.user_id !== userId);
    const updatedMessages = state.chatMessages.filter(m => m.user_id !== userId);
    save({ ...state, users: updatedUsers, predictions: updatedPredictions,
      transactions: updatedTransactions, chatMessages: updatedMessages });
  }, [state, save]);

  const blockUser = useCallback((userId: string) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, role: "blocked" as const } : u);
    const updatedCurrentUser = state.currentUser?.id === userId ? null : state.currentUser;
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser });
  }, [state, save]);

  const unblockUser = useCallback((userId: string) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, role: "user" as const } : u);
    save({ ...state, users: updatedUsers });
  }, [state, save]);

  const addCredits = useCallback((userId: string, amount: number) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, credits: u.credits + amount } : u);
    const newTx: CreditTransaction = { id: `tx-${Date.now()}`, user_id: userId, amount,
      type: "admin_grant", description: `Admin kredi ekledi: +${amount}`, created_at: new Date().toISOString() };
    const updatedCurrentUser = state.currentUser?.id === userId
      ? { ...state.currentUser, credits: state.currentUser.credits + amount } : state.currentUser;
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser, transactions: [...state.transactions, newTx] });
  }, [state, save]);

  const removeCredits = useCallback((userId: string, amount: number) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    const deduct = Math.min(amount, user.credits);
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, credits: Math.max(0, u.credits - amount) } : u);
    const newTx: CreditTransaction = { id: `tx-${Date.now()}`, user_id: userId, amount: -deduct,
      type: "admin_grant", description: `Admin kredi kesti: -${deduct}`, created_at: new Date().toISOString() };
    const updatedCurrentUser = state.currentUser?.id === userId
      ? { ...state.currentUser, credits: Math.max(0, state.currentUser.credits - amount) } : state.currentUser;
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser, transactions: [...state.transactions, newTx] });
  }, [state, save]);

  // ── Admin - Matches ───────────────────────────────────────
  const createMatch = useCallback((matchData: Omit<Match, "id" | "winner" | "status">) => {
    const newMatch: Match = { ...matchData, id: `match-${Date.now()}`, winner: null, status: "open" };
    save({ ...state, matches: [...state.matches, newMatch] });
  }, [state, save]);

  const closeMatch = useCallback((matchId: string, winner: "A" | "B") => {
    const match = state.matches.find(m => m.id === matchId);
    if (!match) return;
    const odds = winner === "A" ? match.odds_a : match.odds_b;
    const updatedMatches = state.matches.map(m =>
      m.id === matchId ? { ...m, status: "finished" as const, winner } : m);
    const updatedPredictions = state.predictions.map(p =>
      p.match_id !== matchId || p.result !== "pending" ? p
        : { ...p, result: p.choice === winner ? "won" as const : "lost" as const });
    let updatedUsers = [...state.users];
    const newTxs: CreditTransaction[] = [];
    state.predictions.filter(p => p.match_id === matchId && p.result === "pending").forEach(p => {
      if (p.choice === winner) {
        const win = Math.round(p.amount * odds);
        updatedUsers = updatedUsers.map(u => u.id === p.user_id ? { ...u, credits: u.credits + win } : u);
        newTxs.push({ id: `tx-${Date.now()}-${p.id}`, user_id: p.user_id, amount: win, type: "win",
          description: `Kazanç - ${match.player_a} vs ${match.player_b}`, created_at: new Date().toISOString() });
      }
    });
    const updatedCurrentUser = state.currentUser ? updatedUsers.find(u => u.id === state.currentUser!.id) || state.currentUser : null;
    save({ ...state, matches: updatedMatches, predictions: updatedPredictions,
      users: updatedUsers, currentUser: updatedCurrentUser, transactions: [...state.transactions, ...newTxs] });
  }, [state, save]);

  const deleteMatch = useCallback((matchId: string) => {
    save({ ...state, matches: state.matches.filter(m => m.id !== matchId),
      predictions: state.predictions.filter(p => p.match_id !== matchId) });
  }, [state, save]);

  // ── Admin - Chat ──────────────────────────────────────────
  const toggleChatEnabled = useCallback(() => {
    save({ ...state, chatEnabled: !state.chatEnabled });
  }, [state, save]);

  const blockUserFromChat = useCallback((userId: string) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, chatBlocked: true } : u);
    const updatedCurrentUser = state.currentUser?.id === userId
      ? { ...state.currentUser, chatBlocked: true } : state.currentUser;
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser });
  }, [state, save]);

  const unblockUserFromChat = useCallback((userId: string) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, chatBlocked: false } : u);
    const updatedCurrentUser = state.currentUser?.id === userId
      ? { ...state.currentUser, chatBlocked: false } : state.currentUser;
    save({ ...state, users: updatedUsers, currentUser: updatedCurrentUser });
  }, [state, save]);

  const deleteChatMessage = useCallback((id: string) => {
    save({ ...state, chatMessages: state.chatMessages.filter(m => m.id !== id) });
  }, [state, save]);

  const pinChatMessage = useCallback((id: string) => {
    save({ ...state, chatMessages: state.chatMessages.map(m => ({ ...m, pinned: m.id === id ? true : m.pinned })) });
  }, [state, save]);

  const unpinChatMessage = useCallback((id: string) => {
    save({ ...state, chatMessages: state.chatMessages.map(m => m.id === id ? { ...m, pinned: false } : m) });
  }, [state, save]);

  // ── Admin - Settings ──────────────────────────────────────
  const updateSiteSettings = useCallback((settings: Partial<SiteSettings>) => {
    save({ ...state, siteSettings: { ...state.siteSettings, ...settings } });
  }, [state, save]);

  // ── Chat - User ───────────────────────────────────────────
  const sendChatMessage = useCallback((text: string) => {
    if (!state.currentUser) return { success: false, error: "Giriş yapmanız gerekiyor" };
    if (!state.chatEnabled) return { success: false, error: "Sohbet şu an devre dışı" };
    const user = state.users.find(u => u.id === state.currentUser!.id);
    if (user?.chatBlocked) return { success: false, error: "Sohbet gönderme yetkiniz kaldırılmış" };
    if (!text.trim()) return { success: false, error: "Mesaj boş olamaz" };
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`, user_id: state.currentUser.id, username: state.currentUser.username,
      avatarUrl: state.currentUser.avatarUrl, text: text.trim(), created_at: new Date().toISOString(),
    };
    save({ ...state, chatMessages: [...state.chatMessages, msg] });
    return { success: true };
  }, [state, save]);

  // ── Helpers ───────────────────────────────────────────────
  const getUserById = useCallback((id: string) => state.users.find(u => u.id === id), [state.users]);
  const getUserPredictions = useCallback((userId: string) =>
    state.predictions.filter(p => p.user_id === userId)
      .map(p => ({ ...p, match: state.matches.find(m => m.id === p.match_id) }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [state.predictions, state.matches]);

  return (
    <AppContext.Provider value={{
      ...state,
      login, logout, register, setUserAvatar,
      placePrediction,
      approveUser, rejectUser, deleteUser, blockUser, unblockUser, addCredits, removeCredits,
      createMatch, closeMatch, deleteMatch,
      toggleChatEnabled, blockUserFromChat, unblockUserFromChat, deleteChatMessage, pinChatMessage, unpinChatMessage,
      updateSiteSettings,
      sendChatMessage,
      getUserById, getUserPredictions,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
