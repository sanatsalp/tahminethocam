"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  Profile, Match, Prediction, CreditTransaction, ChatMessage, SiteSettings, DEFAULT_SITE_SETTINGS
} from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { getActiveMatchCount, getOpenMatches } from "@/lib/dashboard-data";

interface AppState {
  currentUser: Profile | null;
  authLoading: boolean; // true until first auth+data check completes
  activeMatchCount: number | null;
  activeMatchCountLoading: boolean;
  openMatches: Match[];
  openMatchesLoading: boolean;
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
  updateMatch: (id: string, updates: Partial<Match>) => Promise<{ success: boolean; error?: string }>;
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

  // Lazy data loaders (route-based)
  ensureDashboardSecondary: () => Promise<void>;
  ensureLeaderboardUsers: () => Promise<void>;
  ensureChatMessages: () => Promise<void>;
  ensureProfileData: () => Promise<void>;
  ensureAdminData: () => Promise<void>;
  ensureMatchDetailData: (matchId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);
const PROFILE_CACHE_KEY = "app_profile_cache_v1";
const SETTINGS_CACHE_KEY = "app_settings_cache_v1";
const REFRESH_DEBOUNCE_MS = 400;

const PROFILE_SELECT =
  "id,username,email,role,credits,created_at,avatar_url,chat_blocked,is_approved,is_blocked";
const SETTINGS_SELECT =
  "id,title,subtitle,logo_emoji,custom_logo_url,chat_enabled," +
  "tower_game_enabled,tower_game_visible,tower_game_maintenance," +
  "tower_game_max_bet_amount,tower_game_daily_play_limit";
const MATCHES_SELECT =
  "id,title,player_a,player_b,player_a_img,player_b_img,odds_a,odds_b,status,winner,tournament,scheduled_at";
const PREDICTIONS_SELECT = "id,user_id,match_id,choice,amount,potential_win,result,created_at";
const TRANSACTIONS_SELECT = "id,user_id,amount,type,description,created_at";
const CHAT_MESSAGES_SELECT = "id,user_id,username,avatar_url,text,created_at,pinned";
const LEADERBOARD_PROFILE_SELECT = "id,username,role,credits,avatar_url";


function getInitialState(): AppState {
  return {
    currentUser: null,
    authLoading: true, // start as loading until we know auth state
    activeMatchCount: null,
    activeMatchCountLoading: true,
    openMatches: [],
    openMatchesLoading: true,
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
  const currentUserIdRef = useRef<string | null>(null);
  const refreshTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const inFlight = useRef<Record<string, Promise<void> | null>>({});
  const loadedRef = useRef({
    dashboardSecondary: false,
    leaderboardUsers: false,
    chatMessages: false,
    profileData: false,
    adminData: false,
    myPredictions: false,
    myTransactions: false,
    matchesState: false,
    fetchedMatchIds: {} as Record<string, boolean>,
  });

  const mapProfile = useCallback((row: Record<string, unknown>): Profile => ({
    id: String(row.id ?? ""),
    username: String(row.username ?? ""),
    email: String(row.email ?? ""),
    role: (row.role as Profile["role"]) ?? "user",
    credits: Number(row.credits ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    avatarUrl: (row.avatar_url as string | undefined) || undefined,
    chatBlocked: Boolean(row.chat_blocked),
    is_approved: row.is_approved as boolean | undefined,
    is_blocked: row.is_blocked as boolean | undefined,
  }), []);

  const mapSettings = useCallback((settingsRow: Record<string, unknown> | null): SiteSettings => {
    if (!settingsRow) return DEFAULT_SITE_SETTINGS;
    return {
      title: (settingsRow.title as string) || DEFAULT_SITE_SETTINGS.title,
      subtitle: (settingsRow.subtitle as string) || DEFAULT_SITE_SETTINGS.subtitle,
      logoEmoji: (settingsRow.logo_emoji as string) || DEFAULT_SITE_SETTINGS.logoEmoji,
      customLogoUrl: settingsRow.custom_logo_url as string | undefined,
      chatEnabled: settingsRow.chat_enabled !== false,

      towerGameEnabled: settingsRow.tower_game_enabled !== false,
      towerGameVisible: settingsRow.tower_game_visible !== false,
      towerGameMaintenance: Boolean(settingsRow.tower_game_maintenance),
      towerGameMaxBetAmount: Number(settingsRow.tower_game_max_bet_amount ?? DEFAULT_SITE_SETTINGS.towerGameMaxBetAmount),
      towerGameDailyPlayLimit: Number(
        settingsRow.tower_game_daily_play_limit ?? DEFAULT_SITE_SETTINGS.towerGameDailyPlayLimit
      ),
    };
  }, []);

  const runDeduped = useCallback(async (key: string, fn: () => Promise<void>) => {
    if (inFlight.current[key]) return inFlight.current[key];
    const task = fn()
      .catch((error) => {
        console.error(`${key} refresh failed`, error);
      })
      .finally(() => {
        inFlight.current[key] = null;
      });
    inFlight.current[key] = task;
    return task;
  }, []);

  const scheduleRefresh = useCallback((key: string, fn: () => Promise<void>) => {
    const existing = refreshTimers.current[key];
    if (existing) clearTimeout(existing);
    refreshTimers.current[key] = setTimeout(() => {
      void runDeduped(key, fn);
    }, REFRESH_DEBOUNCE_MS);
  }, [runDeduped]);

  const fetchSettings = useCallback(async () => {
    const { data: settingsRow } = await supabase.from("site_settings").select(SETTINGS_SELECT).eq("id", 1).single();
    const mappedSettings = mapSettings(settingsRow as Record<string, unknown> | null);
    try {
      sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(mappedSettings));
    } catch {}
    setState((s) => ({
      ...s,
      siteSettings: mappedSettings,
      chatEnabled: mappedSettings.chatEnabled ?? true,
    }));
  }, [mapSettings]);

  const fetchProfile = useCallback(async (userId: string) => {
    // Attempt to claim weekly credits silently in the background FIRST
    try {
      await supabase.rpc("claim_weekly_credits", { p_user_id: userId });
    } catch (e) {
      // Ignore errors for silent claim
    }

    const { data: row } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", userId).single();
    const mapped = row ? mapProfile(row as Record<string, unknown>) : null;
    if (mapped) {
      try {
        sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(mapped));
      } catch {}
    }
    setState((s) => ({ ...s, currentUser: mapped }));
  }, [mapProfile]);

  const fetchDashboardPrimary = useCallback(async () => {
    setState((s) => ({
      ...s,
      activeMatchCountLoading: true,
      openMatchesLoading: true,
    }));

    await runDeduped("dashboard_primary", async () => {
      const [activeCount, openMatches] = await Promise.all([
        getActiveMatchCount(),
        getOpenMatches(),
      ]);

      setState((s) => ({
        ...s,
        activeMatchCount: activeCount,
        activeMatchCountLoading: false,
        openMatches,
        openMatchesLoading: false,
      }));
    });
  }, [runDeduped]);

  // ── Lazy slice fetchers (only called from the relevant pages) ─────────────
  const fetchLeaderboardUsers = useCallback(async () => {
    const { data: users } = await supabase
      .from("profiles")
      .select(LEADERBOARD_PROFILE_SELECT)
      .order("credits", { ascending: false });

    setState((s) => ({
      ...s,
      users: (users || []).map((u) => mapProfile(u as Record<string, unknown>)),
    }));
  }, [mapProfile]);

  const fetchChatMessagesSlice = useCallback(async () => {
    const { data: chatMsgs } = await supabase
      .from("chat_messages")
      .select(CHAT_MESSAGES_SELECT)
      .order("created_at", { ascending: true })
      .limit(200);

    setState((s) => ({
      ...s,
      chatMessages: (chatMsgs || []).map((m) => ({
        ...(m as ChatMessage),
        avatarUrl: (m as Record<string, unknown>).avatar_url as string | undefined,
      })),
    }));
  }, []);

  const fetchMyPredictions = useCallback(async (userId: string): Promise<Prediction[]> => {
    const { data: preds } = await supabase
      .from("predictions")
      .select(PREDICTIONS_SELECT)
      .eq("user_id", userId);

    setState((s) => ({
      ...s,
      predictions: (preds || []) as Prediction[],
    }));

    return (preds || []) as Prediction[];
  }, []);

  const fetchMyTransactions = useCallback(async (userId: string): Promise<CreditTransaction[]> => {
    const { data: txs } = await supabase
      .from("transactions")
      .select(TRANSACTIONS_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setState((s) => ({
      ...s,
      transactions: (txs || []) as CreditTransaction[],
    }));

    return (txs || []) as CreditTransaction[];
  }, []);

  const fetchClosedFinishedMatchesSlice = useCallback(async () => {
    const { data: matches } = await supabase
      .from("matches")
      .select(MATCHES_SELECT)
      .in("status", ["closed", "finished"])
      .order("scheduled_at", { ascending: true });

    setState((s) => ({
      ...s,
      matches: (matches || []) as Match[],
    }));
  }, []);

  const fetchMatchesByIdsSlice = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data: rows } = await supabase
      .from("matches")
      .select(MATCHES_SELECT)
      .in("id", ids);

    setState((s) => {
      const next = [...s.matches];
      const byId = new Map(next.map((m) => [m.id, m]));
      (rows || []).forEach((m) => {
        byId.set((m as Match).id, m as Match);
      });
      return { ...s, matches: Array.from(byId.values()) };
    });
  }, []);

  const ensureDashboardSecondary = useCallback(async () => {
    if (!state.currentUser) return;
    if (loadedRef.current.dashboardSecondary) return;

    await runDeduped("dashboard_secondary", async () => {
      const userId = state.currentUser!.id;
      await Promise.all([
        fetchClosedFinishedMatchesSlice(),
        fetchMyPredictions(userId),
      ]);

      loadedRef.current.dashboardSecondary = true;
      loadedRef.current.matchesState = true;
      loadedRef.current.myPredictions = true;
    });
  }, [fetchClosedFinishedMatchesSlice, fetchMyPredictions, runDeduped, state.currentUser]);

  const ensureLeaderboardUsers = useCallback(async () => {
    if (loadedRef.current.leaderboardUsers) return;

    await runDeduped("leaderboard_users", async () => {
      await fetchLeaderboardUsers();
      loadedRef.current.leaderboardUsers = true;
    });
  }, [fetchLeaderboardUsers, runDeduped]);

  const ensureChatMessages = useCallback(async () => {
    if (loadedRef.current.chatMessages) return;

    await runDeduped("chat_messages", async () => {
      await fetchChatMessagesSlice();
      loadedRef.current.chatMessages = true;
    });
  }, [fetchChatMessagesSlice, runDeduped]);

  const ensureProfileData = useCallback(async () => {
    if (!state.currentUser) return;
    if (loadedRef.current.profileData) return;

    await runDeduped("profile_data", async () => {
      const userId = state.currentUser!.id;

      const [preds] = await Promise.all([
        fetchMyPredictions(userId),
        fetchMyTransactions(userId),
      ]);

      // matches join for the user's predictions
      const matchIds = Array.from(new Set((preds || []).map((p) => p.match_id)));
      await fetchMatchesByIdsSlice(matchIds);

      loadedRef.current.myPredictions = true;
      loadedRef.current.myTransactions = true;
      loadedRef.current.matchesState = true;
      loadedRef.current.profileData = true;
    });
  }, [fetchMatchesByIdsSlice, fetchMyPredictions, fetchMyTransactions, runDeduped, state.currentUser]);

  const ensureAdminData = useCallback(async () => {
    if (loadedRef.current.adminData) return;

    await runDeduped("admin_data", async () => {
      const [{ data: users }, { data: matches }, { data: chatMsgs }] = await Promise.all([
        supabase.from("profiles").select(PROFILE_SELECT).order("credits", { ascending: false }),
        supabase.from("matches").select(MATCHES_SELECT).order("scheduled_at", { ascending: true }),
        supabase.from("chat_messages").select(CHAT_MESSAGES_SELECT).order("created_at", { ascending: true }).limit(200),
      ]);

      setState((s) => ({
        ...s,
        users: (users || []).map((u) => mapProfile(u as Record<string, unknown>)),
        matches: (matches || []) as Match[],
        chatMessages: (chatMsgs || []).map((m) => ({
          ...(m as ChatMessage),
          avatarUrl: (m as Record<string, unknown>).avatar_url as string | undefined,
        })),
      }));
      loadedRef.current.matchesState = true;
      loadedRef.current.chatMessages = true;
      loadedRef.current.myPredictions = false; // admin closeMatch re-queries pending predictions
      loadedRef.current.adminData = true;
    });
  }, [mapProfile, runDeduped]);

  const ensureMatchDetailData = useCallback(async (matchId: string) => {
    if (!state.currentUser) return;
    const alreadyHaveMatch = state.matches.some((m) => m.id === matchId) || state.openMatches.some((m) => m.id === matchId);
    const alreadyHavePred = state.predictions.some((p) => p.match_id === matchId && p.user_id === state.currentUser!.id);
    if (alreadyHaveMatch && alreadyHavePred) return;
    if (loadedRef.current.fetchedMatchIds[matchId] && alreadyHavePred) return;

    let hadMatch = false;
    let hadPrediction = false;
    await runDeduped(`match_detail_${matchId}`, async () => {
      const [{ data: matchRow }, { data: predRow }] = await Promise.all([
        supabase.from("matches").select(MATCHES_SELECT).eq("id", matchId).single(),
        supabase
          .from("predictions")
          .select(PREDICTIONS_SELECT)
          .eq("user_id", state.currentUser!.id)
          .eq("match_id", matchId)
          .maybeSingle(),
      ]);

      if (matchRow) {
        hadMatch = true;
        setState((s) => {
          const byId = new Map(s.matches.map((m) => [m.id, m]));
          byId.set((matchRow as Match).id, matchRow as Match);
          return { ...s, matches: Array.from(byId.values()) };
        });
      }

      if (predRow) {
        hadPrediction = true;
        setState((s) => {
          const next = [...s.predictions];
          const idx = next.findIndex((p) => p.id === predRow.id);
          if (idx >= 0) next[idx] = predRow as Prediction;
          else next.push(predRow as Prediction);
          return { ...s, predictions: next };
        });
      }
    });

    loadedRef.current.matchesState = true;
    if (hadPrediction) loadedRef.current.myPredictions = true;
    if (hadMatch) loadedRef.current.fetchedMatchIds[matchId] = true;
  }, [runDeduped, state.currentUser, state.matches, state.openMatches, state.predictions]);

  const bootstrapAuthAndCritical = useCallback(async () => {
    try {
      let cachedSettings: SiteSettings | null = null;
      try {
        const cachedSettingsRaw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
        cachedSettings = cachedSettingsRaw ? (JSON.parse(cachedSettingsRaw) as SiteSettings) : null;
      } catch {}

      if (cachedSettings) {
        setState((s) => ({
          ...s,
          siteSettings: cachedSettings as SiteSettings,
          chatEnabled: cachedSettings.chatEnabled ?? true,
        }));
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        try {
          sessionStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {}

        setState((s) => ({
          ...s,
          currentUser: null,
          authLoading: false,
          activeMatchCount: null,
          activeMatchCountLoading: false,
          openMatches: [],
          openMatchesLoading: false,
          siteSettings: cachedSettings ?? DEFAULT_SITE_SETTINGS,
          chatEnabled: (cachedSettings?.chatEnabled ?? DEFAULT_SITE_SETTINGS.chatEnabled) ?? true,
        }));
        return;
      }

      const myId = session.user.id;

      const cachedProfile = (() => {
        try {
          const cachedRaw = sessionStorage.getItem(PROFILE_CACHE_KEY);
          if (!cachedRaw) return null;
          const parsed = JSON.parse(cachedRaw) as Profile;
          return parsed?.id === myId ? parsed : null;
        } catch {
          return null;
        }
      })();

      // Phase 1: Auth + profile from cache (or fresh fetch) => unlock UI immediately.
      if (cachedProfile) {
        setState((s) => ({
          ...s,
          currentUser: cachedProfile,
          authLoading: false,
          siteSettings: cachedSettings ?? s.siteSettings,
          chatEnabled: (cachedSettings?.chatEnabled ?? s.chatEnabled) ?? true,
        }));

        // Revalidate in background (do not block UI)
        void (async () => {
          try {
            const [settingsRes, profileRes] = await Promise.all([
              supabase.from("site_settings").select(SETTINGS_SELECT).eq("id", 1).single(),
              supabase.from("profiles").select(PROFILE_SELECT).eq("id", myId).single(),
            ]);

            const mappedSettings = mapSettings(settingsRes.data as Record<string, unknown> | null);
            try {
              sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(mappedSettings));
            } catch {}

            const mappedProfile = profileRes.data ? mapProfile(profileRes.data as Record<string, unknown>) : null;
            if (mappedProfile) {
              try {
                sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(mappedProfile));
              } catch {}
            }

            setState((s) => ({
              ...s,
              currentUser: mappedProfile ?? s.currentUser,
              siteSettings: mappedSettings,
              chatEnabled: mappedSettings.chatEnabled ?? true,
            }));
          } catch {
            // Silently ignore revalidate errors; UI is already unlocked.
          }
        })();

        return;
      }

      // No usable cache: fetch critical profile before unlocking.
      const [{ data: settingsRow }, { data: profileRow }] = await Promise.all([
        supabase.from("site_settings").select(SETTINGS_SELECT).eq("id", 1).single(),
        supabase.from("profiles").select(PROFILE_SELECT).eq("id", myId).single(),
      ]);

      const mappedSettings = mapSettings(settingsRow as Record<string, unknown> | null);
      try {
        sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(mappedSettings));
      } catch {}

      const mappedProfile = profileRow ? mapProfile(profileRow as Record<string, unknown>) : null;
      if (mappedProfile) {
        try {
          sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(mappedProfile));
        } catch {}
      }

      setState((s) => ({
        ...s,
        currentUser: mappedProfile,
        authLoading: false,
        siteSettings: mappedSettings,
        chatEnabled: mappedSettings.chatEnabled ?? true,
      }));
    } catch (err) {
      console.error("bootstrapAuthAndCritical failed:", err);
      setState((s) => ({ ...s, authLoading: false }));
    }
  }, [mapProfile, mapSettings]);

  useEffect(() => {
    currentUserIdRef.current = state.currentUser?.id ?? null;
  }, [state.currentUser?.id]);

  useEffect(() => {
    void bootstrapAuthAndCritical().then(() => {
      void fetchDashboardPrimary();
    });

    const channel = supabase.channel("global_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        scheduleRefresh("settings", fetchSettings);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        const myId = currentUserIdRef.current;
        if (myId) {
          scheduleRefresh("my_profile", async () => {
            await fetchProfile(myId);
          });
        }

        if (loadedRef.current.adminData) {
          scheduleRefresh("admin_users", async () => {
            const { data: users } = await supabase
              .from("profiles")
              .select(PROFILE_SELECT)
              .order("credits", { ascending: false });
            setState((s) => ({
              ...s,
              users: (users || []).map((u) => mapProfile(u as Record<string, unknown>)),
            }));
          });
        } else if (loadedRef.current.leaderboardUsers) {
          scheduleRefresh("leaderboard_users", async () => {
            await fetchLeaderboardUsers();
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        scheduleRefresh("matches_primary", fetchDashboardPrimary);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        const myId = currentUserIdRef.current;
        if (loadedRef.current.myPredictions && myId) {
          scheduleRefresh("my_predictions", async () => {
            await fetchMyPredictions(myId);
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        const myId = currentUserIdRef.current;
        if (loadedRef.current.myTransactions && myId) {
          scheduleRefresh("my_transactions", async () => {
            await fetchMyTransactions(myId);
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        if (loadedRef.current.chatMessages) {
          scheduleRefresh("chat_messages", fetchChatMessagesSlice);
        }
      })
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        try {
          sessionStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {}
        loadedRef.current = {
          dashboardSecondary: false,
          leaderboardUsers: false,
          chatMessages: false,
          profileData: false,
          adminData: false,
          myPredictions: false,
          myTransactions: false,
          matchesState: false,
          fetchedMatchIds: {} as Record<string, boolean>,
        };
        setState((s) => ({
          ...s,
          currentUser: null,
          authLoading: false,
          activeMatchCount: null,
          activeMatchCountLoading: false,
          openMatches: [],
          openMatchesLoading: false,
          users: [],
          matches: [],
          predictions: [],
          transactions: [],
          chatMessages: [],
        }));
        return;
      }
      await runDeduped("auth_profile", async () => {
        await fetchProfile(session.user.id);
        void fetchDashboardPrimary();
        setState((s) => ({ ...s, authLoading: false }));
      });
    });

    return () => {
      channel.unsubscribe();
      subscription.unsubscribe();
      Object.values(refreshTimers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [
    bootstrapAuthAndCritical,
    fetchDashboardPrimary,
    fetchProfile,
    fetchSettings,
    fetchLeaderboardUsers,
    fetchChatMessagesSlice,
    fetchMyPredictions,
    fetchMyTransactions,
    runDeduped,
    scheduleRefresh,
  ]);

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

    await runDeduped("post_login", async () => {
      await bootstrapAuthAndCritical();
      await fetchDashboardPrimary();
    });
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    loadedRef.current = {
      dashboardSecondary: false,
      leaderboardUsers: false,
      chatMessages: false,
      profileData: false,
      adminData: false,
      myPredictions: false,
      myTransactions: false,
      matchesState: false,
      fetchedMatchIds: {} as Record<string, boolean>,
    };
    try {
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {}
    setState(s => ({
      ...s,
      currentUser: null,
      activeMatchCount: null,
      activeMatchCountLoading: false,
      openMatches: [],
      openMatchesLoading: false,
      users: [],
      matches: [],
      predictions: [],
      transactions: [],
      chatMessages: [],
    }));
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
    const user = state.currentUser;
    if (user.credits < amount) return { success: false, error: "Yetersiz kredi" };

    const match = state.matches.find(m => m.id === matchId) ?? state.openMatches.find(m => m.id === matchId);
    if (!match || match.status !== "open") return { success: false, error: "Bu maça tahmin yapılamaz" };
    if (state.predictions.find(p => p.user_id === user.id && p.match_id === matchId))
      return { success: false, error: "Bu maça zaten tahmin yaptınız" };

    // Predictions slice lazy yüklendiyse, çakışmayı garanti etmek için minimum kontrol yap.
    if (!loadedRef.current.myPredictions) {
      const { data: existing } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", user.id)
        .eq("match_id", matchId)
        .limit(1);
      if (existing && existing.length > 0)
        return { success: false, error: "Bu maça zaten tahmin yaptınız" };
    }

    const odds = choice === "A" ? match.odds_a : match.odds_b;
    const potentialWin = Math.round(amount * odds);

    const { data: inserted, error } = await supabase
      .from("predictions")
      .insert({
        user_id: user.id,
        match_id: matchId,
        choice,
        amount,
        potential_win: potentialWin,
        result: "pending",
      })
      .select(PREDICTIONS_SELECT)
      .single();

    if (error) return { success: false, error: "Bir sistem hatası oluştu." };

    const newCredits = user.credits - amount;
    const txDesc = `Tahmin - ${match.player_a} vs ${match.player_b}`;
    await Promise.all([
      supabase.from("transactions").insert({
        user_id: user.id,
        amount: -amount,
        type: "prediction",
        description: txDesc,
      }),
      supabase.from("profiles").update({ credits: newCredits }).eq("id", user.id),
    ]);

    setState((s) => ({
      ...s,
      currentUser: s.currentUser ? { ...s.currentUser, credits: newCredits } : s.currentUser,
      predictions: inserted
        ? [...s.predictions.filter(p => !(p.user_id === user.id && p.match_id === matchId)), inserted as Prediction]
        : s.predictions,
      users: s.users.map(u => (u.id === user.id ? { ...u, credits: newCredits } : u)),
    }));

    loadedRef.current.myPredictions = true;
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
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id,player_a,player_b,odds_a,odds_b")
      .eq("id", matchId)
      .single();

    if (!matchRow) return;

    await supabase.from("matches").update({ status: "finished", winner }).eq("id", matchId);
    setState((s) => ({
      ...s,
      matches: s.matches.map((m) => (m.id === matchId ? { ...m, status: "finished", winner } : m)),
      openMatches: s.openMatches.map((m) => (m.id === matchId ? { ...m, status: "finished", winner } : m)),
    }));

    const odds = winner === "A" ? matchRow.odds_a : matchRow.odds_b;

    const { data: pendingPreds } = await supabase
      .from("predictions")
      .select("id,user_id,choice,amount")
      .eq("match_id", matchId)
      .eq("result", "pending");

    const preds = pendingPreds || [];
    const winners = preds.filter((p) => p.choice === winner);

    // Toplu durum güncellemesi (sadece pending)
    await Promise.all([
      supabase
        .from("predictions")
        .update({ result: "won" })
        .eq("match_id", matchId)
        .eq("result", "pending")
        .eq("choice", winner),
      supabase
        .from("predictions")
        .update({ result: "lost" })
        .eq("match_id", matchId)
        .eq("result", "pending")
        .neq("choice", winner),
    ]);

    if (winners.length === 0) return;

    // Aynı kullanıcı birden fazla tahmin verdiyse toplu kazanç hesapla.
    const winByUser = new Map<string, number>();
    for (const p of winners) {
      const winAmount = Math.round(p.amount * odds);
      winByUser.set(p.user_id, (winByUser.get(p.user_id) || 0) + winAmount);
    }

    const winnerUserIds = Array.from(winByUser.keys());
    const { data: winnerProfiles } = await supabase
      .from("profiles")
      .select("id,credits")
      .in("id", winnerUserIds);

    const txDesc = `Kazanç - ${matchRow.player_a} vs ${matchRow.player_b}`;

    await Promise.all(
      (winnerProfiles || []).map(async (u) => {
        const inc = winByUser.get(u.id) || 0;
        const nextCredits = u.credits + inc;
        await supabase.from("profiles").update({ credits: nextCredits }).eq("id", u.id);
        await supabase.from("transactions").insert({
          user_id: u.id,
          amount: inc,
          type: "win",
          description: txDesc,
        });
      })
    );

    // UI'ı hızlı güncelle: kazanmış tüm kullanıcıların kredilerini lokal state'te yansıt.
    setState((s) => ({
      ...s,
      currentUser:
        s.currentUser && winByUser.has(s.currentUser.id)
          ? { ...s.currentUser, credits: s.currentUser.credits + (winByUser.get(s.currentUser.id) || 0) }
          : s.currentUser,
      users: s.users.map((u) => (winByUser.has(u.id) ? { ...u, credits: u.credits + (winByUser.get(u.id) || 0) } : u)),
    }));
  };

  const deleteMatch = async (matchId: string) => {
    await supabase.from("matches").delete().eq("id", matchId);
    setState(s => ({
      ...s,
      matches: s.matches.filter(m => m.id !== matchId),
      openMatches: s.openMatches.filter(m => m.id !== matchId)
    }));
  };

  const updateMatch = async (matchId: string, updates: Partial<Match>) => {
    const { data: updated, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      console.error("Match update error:", error.message);
      return { success: false, error: error.message };
    }

    setState(s => {
      const updateArr = (arr: Match[]) => arr.map(m => m.id === matchId ? { ...m, ...updated } : m);
      return {
        ...s,
        matches: updateArr(s.matches),
        openMatches: updateArr(s.openMatches)
      };
    });

    return { success: true };
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
      if (settings.chatEnabled !== undefined) dbParams.chat_enabled = settings.chatEnabled;
      if (settings.towerGameEnabled !== undefined) dbParams.tower_game_enabled = settings.towerGameEnabled;
      if (settings.towerGameVisible !== undefined) dbParams.tower_game_visible = settings.towerGameVisible;
      if (settings.towerGameMaintenance !== undefined) dbParams.tower_game_maintenance = settings.towerGameMaintenance;
      if (settings.towerGameMaxBetAmount !== undefined) dbParams.tower_game_max_bet_amount = settings.towerGameMaxBetAmount;
      if (settings.towerGameDailyPlayLimit !== undefined) dbParams.tower_game_daily_play_limit = settings.towerGameDailyPlayLimit;
    await supabase.from("site_settings").update(dbParams).eq("id", 1);
  };

  // ── Chat - User ───────────────────────────────────────────
  const sendChatMessage = async (text: string) => {
    if (!state.currentUser) return { success: false, error: "Giriş yapmanız gerekiyor" };
    if (!state.chatEnabled) return { success: false, error: "Sohbet şu an devre dışı" };
    const user = state.currentUser;
    if (user.chatBlocked) return { success: false, error: "Sohbet gönderme yetkiniz kaldırılmış" };
    if (!text.trim()) return { success: false, error: "Mesaj boş olamaz" };

    const cleanText = text.trim();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      user_id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      text: cleanText,
      created_at: new Date().toISOString(),
      pinned: false,
    };

    setState((s) => ({ ...s, chatMessages: [...s.chatMessages, optimistic] }));

    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatarUrl,
        text: cleanText,
      })
      .select(CHAT_MESSAGES_SELECT)
      .single();

    if (error || !inserted) {
      setState((s) => ({ ...s, chatMessages: s.chatMessages.filter((m) => m.id !== tempId) }));
      return { success: false, error: "Mesaj gönderilemedi" };
    }

    const mappedInserted: ChatMessage = {
      ...(inserted as ChatMessage),
      avatarUrl: (inserted as Record<string, unknown>).avatar_url as string | undefined,
    };

    setState((s) => ({
      ...s,
      chatMessages: s.chatMessages.map((m) => (m.id === tempId ? mappedInserted : m)),
    }));

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
      createMatch, closeMatch, deleteMatch, updateMatch,
      toggleChatEnabled, blockUserFromChat, unblockUserFromChat, deleteChatMessage, pinChatMessage, unpinChatMessage,
      updateSiteSettings,
      sendChatMessage,
      getUserById, getUserPredictions,
      ensureDashboardSecondary,
      ensureLeaderboardUsers,
      ensureChatMessages,
      ensureProfileData,
      ensureAdminData,
      ensureMatchDetailData,
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
