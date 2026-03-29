"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  Profile, Match, Prediction, CreditTransaction, ChatMessage, SiteSettings, DEFAULT_SITE_SETTINGS
} from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";

interface AppState {
  currentUser: Profile | null;
  authLoading: boolean; // true until first auth+data check completes
  users: Profile[];
  matches: Match[];
  predictions: Prediction[];
  transactions: CreditTransaction[];
  chatMessages: ChatMessage[];
  chatEnabled: boolean;
  siteSettings: SiteSettings;
}

interface AppContextType extends AppState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setUserAvatar: (userId: string, dataUrl: string) => Promise<void>;
  placePrediction: (matchId: string, choice: "A" | "B", amount: number) => Promise<{ success: boolean; error?: string }>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  addCredits: (userId: string, amount: number) => Promise<void>;
  removeCredits: (userId: string, amount: number) => Promise<void>;
  createMatch: (match: Omit<Match, "id" | "winner" | "status">) => Promise<void>;
  closeMatch: (matchId: string, winner: "A" | "B") => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  toggleChatEnabled: () => Promise<void>;
  blockUserFromChat: (userId: string) => Promise<void>;
  unblockUserFromChat: (userId: string) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  pinChatMessage: (id: string) => Promise<void>;
  unpinChatMessage: (id: string) => Promise<void>;
  updateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  sendChatMessage: (text: string) => Promise<{ success: boolean; error?: string }>;
  getUserById: (id: string) => Profile | undefined;
  getUserPredictions: (userId: string) => Prediction[];
}

const AppContext = createContext<AppContextType | null>(null);

function getInitialState(): AppState {
  return {
    currentUser: null,
    authLoading: true, // start as loading until we know auth state
    users: [],
    matches: [],
    predictions: [],
    transactions: [],
    chatMessages: [],
    chatEnabled: true,
    siteSettings: DEFAULT_SITE_SETTINGS,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState);
  const isFetching = useRef(false);

  const fetchGlobalData = useCallback(async (isInitial = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      // Phase 1: Critical UI Unblock (Session & Settings)
      const [
        { data: settingsRow },
        { data: { session } },
      ] = await Promise.all([
        supabase.from("site_settings").select("*").eq("id", 1).single(),
        supabase.auth.getSession(),
      ]);

      const mappedSettings = settingsRow ? {
        title: settingsRow.title,
        subtitle: settingsRow.subtitle,
        logoEmoji: settingsRow.logo_emoji,
        customLogoUrl: settingsRow.custom_logo_url,
        chatEnabled: settingsRow.chat_enabled !== false,
      } : DEFAULT_SITE_SETTINGS;

      let currentUser: Profile | null = null;
      if (session) {
        const { data: userRaw } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (userRaw) {
          currentUser = { ...userRaw, avatarUrl: userRaw.avatar_url, chatBlocked: userRaw.chat_blocked } as Profile;
        }
      }

      // Early flush: Unblock AuthGuard rendering instantly
      setState(s => ({
        ...s,
        currentUser,
        authLoading: false,
        siteSettings: mappedSettings,
        chatEnabled: mappedSettings.chatEnabled ?? true,
      }));

      // Phase 2: Secondary Data (Background Loading)
      const [
        { data: users },
        { data: matches },
        { data: predictions },
        { data: transactions },
        { data: chatMsgs },
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("credits", { ascending: false }),
        supabase.from("matches").select("*").order("scheduled_at", { ascending: true }),
        supabase.from("predictions").select("*"),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("chat_messages").select("*").order("created_at", { ascending: true }),
      ]);

      const mappedUsers = (users || []).map(u => ({ ...u, avatarUrl: u.avatar_url, chatBlocked: u.chat_blocked })) as Profile[];
      const mappedChats = (chatMsgs || []).map(m => ({ ...m, avatarUrl: m.avatar_url })) as ChatMessage[];

      setState(s => ({
        ...s,
        users: mappedUsers,
        matches: matches || [],
        predictions: predictions || [],
        transactions: transactions || [],
        chatMessages: mappedChats,
      }));
    } catch (err) {
      console.error("fetchGlobalData failed:", err);
      // Even on error, mark loading as done so the app doesn't hang
      setState(s => ({ ...s, authLoading: false }));
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    // Explicitly call the first fetch to avoid infinite loading if onAuthStateChange misses the tick
    fetchGlobalData(true);

    const channel = supabase.channel("global_sync")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        fetchGlobalData();
      })
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-fetch whenever auth changes (login/logout/token refresh)
      fetchGlobalData();
    });

    return () => {
      channel.unsubscribe();
      subscription.unsubscribe();
    };
  }, [fetchGlobalData]);

  // ── Auth ─────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    const { data: userRaw, error: userErr } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("username", username)
      .single();

    if (!userRaw || userErr) return { success: false, error: "Kullanıcı adı bulunamadı" };
    if (userRaw.role === "pending") return { success: false, error: "Hesabınız henüz onaylanmamış. Admin onayını bekleyin." };
    if (userRaw.role === "blocked") return { success: false, error: "Hesabınız engellenmiştir. Yönetici ile iletişime geçin." };

    const { error: authErr } = await supabase.auth.signInWithPassword({ email: userRaw.email, password });
    if (authErr) return { success: false, error: "Şifre hatalı" };

    await fetchGlobalData();
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState(s => ({ ...s, currentUser: null }));
  };

  const register = async (username: string, email: string, password: string) => {
    if (!/^[a-z0-9_]+$/.test(username))
      return { success: false, error: "Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir" };

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0)
      return { success: false, error: "Bu kullanıcı adı veya e-posta zaten kullanımda" };

    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) return { success: false, error: error.message };

    return { success: true };
  };

  // ── Profile ───────────────────────────────────────────────
  const setUserAvatar = async (userId: string, dataUrl: string) => {
    await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", userId);
    setState(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, avatarUrl: dataUrl } : u),
      currentUser: s.currentUser?.id === userId ? { ...s.currentUser, avatarUrl: dataUrl } : s.currentUser,
    }));
  };

  // ── Predictions ───────────────────────────────────────────
  const placePrediction = async (matchId: string, choice: "A" | "B", amount: number) => {
    if (!state.currentUser) return { success: false, error: "Giriş yapmanız gerekiyor" };
    const user = state.users.find(u => u.id === state.currentUser!.id);
    if (!user) return { success: false, error: "Kullanıcı bulunamadı" };
    if (user.credits < amount) return { success: false, error: "Yetersiz kredi" };

    const match = state.matches.find(m => m.id === matchId);
    if (!match || match.status !== "open") return { success: false, error: "Bu maça tahmin yapılamaz" };
    if (state.predictions.find(p => p.user_id === user.id && p.match_id === matchId))
      return { success: false, error: "Bu maça zaten tahmin yaptınız" };

    const odds = choice === "A" ? match.odds_a : match.odds_b;
    const potentialWin = Math.round(amount * odds);

    const { error } = await supabase.from("predictions").insert({
      user_id: user.id, match_id: matchId, choice, amount, potential_win: potentialWin, result: "pending",
    });
    if (error) return { success: false, error: "Bir sistem hatası oluştu." };

    await supabase.from("transactions").insert({
      user_id: user.id, amount: -amount, type: "prediction",
      description: `Tahmin - ${match.player_a} vs ${match.player_b}`,
    });
    await supabase.from("profiles").update({ credits: user.credits - amount }).eq("id", user.id);

    return { success: true };
  };

  // ── Admin - Users ─────────────────────────────────────────
  const approveUser = async (userId: string) => {
    await supabase.from("profiles").update({ role: "user", credits: 1000 }).eq("id", userId);
    await supabase.from("transactions").insert({
      user_id: userId, amount: 1000, type: "initial", description: "Başlangıç kredisi - Admin onayı",
    });
  };

  const rejectUser = async (userId: string) => {
    await supabase.from("profiles").delete().eq("id", userId);
  };

  const deleteUser = async (userId: string) => {
    if (userId === state.currentUser?.id) return;
    await supabase.from("profiles").delete().eq("id", userId);
  };

  const blockUser = async (userId: string) => {
    await supabase.from("profiles").update({ role: "blocked" }).eq("id", userId);
  };

  const unblockUser = async (userId: string) => {
    await supabase.from("profiles").update({ role: "user" }).eq("id", userId);
  };

  const addCredits = async (userId: string, amount: number) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    await supabase.from("profiles").update({ credits: user.credits + amount }).eq("id", userId);
    await supabase.from("transactions").insert({
      user_id: userId, amount, type: "admin_grant", description: `Admin kredi ekledi: +${amount}`,
    });
  };

  const removeCredits = async (userId: string, amount: number) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    const deduct = Math.min(amount, user.credits);
    await supabase.from("profiles").update({ credits: Math.max(0, user.credits - amount) }).eq("id", userId);
    await supabase.from("transactions").insert({
      user_id: userId, amount: -deduct, type: "admin_grant", description: `Admin kredi kesti: -${deduct}`,
    });
  };

  // ── Admin - Matches ───────────────────────────────────────
  const createMatch = async (matchData: Omit<Match, "id" | "winner" | "status">) => {
    await supabase.from("matches").insert({ ...matchData, winner: null, status: "open" });
  };

  const closeMatch = async (matchId: string, winner: "A" | "B") => {
    const match = state.matches.find(m => m.id === matchId);
    if (!match) return;
    await supabase.from("matches").update({ status: "finished", winner }).eq("id", matchId);

    const odds = winner === "A" ? match.odds_a : match.odds_b;
    const pendingPreds = state.predictions.filter(p => p.match_id === matchId && p.result === "pending");

    for (const p of pendingPreds) {
      if (p.choice === winner) {
        const winAmount = Math.round(p.amount * odds);
        await supabase.from("predictions").update({ result: "won" }).eq("id", p.id);
        const u = state.users.find(u => u.id === p.user_id);
        if (u) {
          await supabase.from("profiles").update({ credits: u.credits + winAmount }).eq("id", u.id);
          await supabase.from("transactions").insert({
            user_id: p.user_id, amount: winAmount, type: "win",
            description: `Kazanç - ${match.player_a} vs ${match.player_b}`,
          });
        }
      } else {
        await supabase.from("predictions").update({ result: "lost" }).eq("id", p.id);
      }
    }
  };

  const deleteMatch = async (matchId: string) => {
    await supabase.from("matches").delete().eq("id", matchId);
  };

  // ── Admin - Chat / Settings ───────────────────────────────
  const toggleChatEnabled = async () => {
    await supabase.from("site_settings").update({ chat_enabled: !state.chatEnabled }).eq("id", 1);
  };

  const blockUserFromChat = async (userId: string) => {
    await supabase.from("profiles").update({ chat_blocked: true }).eq("id", userId);
  };

  const unblockUserFromChat = async (userId: string) => {
    await supabase.from("profiles").update({ chat_blocked: false }).eq("id", userId);
  };

  const deleteChatMessage = async (id: string) => {
    await supabase.from("chat_messages").delete().eq("id", id);
  };

  const pinChatMessage = async (id: string) => {
    await supabase.from("chat_messages").update({ pinned: true }).eq("id", id);
  };

  const unpinChatMessage = async (id: string) => {
    await supabase.from("chat_messages").update({ pinned: false }).eq("id", id);
  };

  const updateSiteSettings = async (settings: Partial<SiteSettings>) => {
    const dbParams: Record<string, unknown> = {};
    if (settings.title !== undefined) dbParams.title = settings.title;
    if (settings.subtitle !== undefined) dbParams.subtitle = settings.subtitle;
    if (settings.logoEmoji !== undefined) dbParams.logo_emoji = settings.logoEmoji;
    if (settings.customLogoUrl !== undefined) dbParams.custom_logo_url = settings.customLogoUrl;
    await supabase.from("site_settings").update(dbParams).eq("id", 1);
  };

  // ── Chat - User ───────────────────────────────────────────
  const sendChatMessage = async (text: string) => {
    if (!state.currentUser) return { success: false, error: "Giriş yapmanız gerekiyor" };
    if (!state.chatEnabled) return { success: false, error: "Sohbet şu an devre dışı" };
    const user = state.users.find(u => u.id === state.currentUser!.id);
    if (!user) return { success: false, error: "Kullanıcı bilgisi alınamadı" };
    if (user.chatBlocked) return { success: false, error: "Sohbet gönderme yetkiniz kaldırılmış" };
    if (!text.trim()) return { success: false, error: "Mesaj boş olamaz" };

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id, username: user.username, avatar_url: user.avatarUrl, text: text.trim(),
    });
    if (error) return { success: false, error: "Mesaj gönderilemedi" };
    return { success: true };
  };

  // ── Helpers ───────────────────────────────────────────────
  const getUserById = useCallback((id: string) => state.users.find(u => u.id === id), [state.users]);

  const getUserPredictions = useCallback((userId: string) =>
    state.predictions
      .filter(p => p.user_id === userId)
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
