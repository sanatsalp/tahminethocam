"use server";

import { supabase } from "@/lib/supabase";
import {
  PredictionMarket,
  PredictionOption,
  PredictionPosition,
  MarketPriceHistory,
} from "@/lib/markets-types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function mapMarket(row: Record<string, unknown>): PredictionMarket {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: (row.description as string | undefined) || undefined,
    category: String(row.category ?? "general"),
    end_time: String(row.end_time ?? ""),
    status: (row.status as PredictionMarket["status"]) ?? "open",
    winning_option_id: (row.winning_option_id as string | null) ?? null,
    total_pool: Number(row.total_pool ?? 0),
    liquidity_constant: Number(row.liquidity_constant ?? 200),
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

function mapOption(row: Record<string, unknown>): PredictionOption {
  return {
    id: String(row.id ?? ""),
    market_id: String(row.market_id ?? ""),
    label: String(row.label ?? ""),
    pool: Number(row.pool ?? 0),
    created_at: String(row.created_at ?? ""),
  };
}

function mapPosition(row: Record<string, unknown>): PredictionPosition {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    market_id: String(row.market_id ?? ""),
    option_id: String(row.option_id ?? ""),
    amount: Number(row.amount ?? 0),
    locked_probability: Number(row.locked_probability ?? 0),
    payout: row.payout != null ? Number(row.payout) : null,
    result: (row.result as PredictionPosition["result"]) ?? "pending",
    created_at: String(row.created_at ?? ""),
  };
}

// ─── Public Read Actions ───────────────────────────────────────────────────────

export type MarketsFilter = "all" | "trending" | "ending_soon" | "resolved";

export async function getMarkets(
  filter: MarketsFilter = "all"
): Promise<PredictionMarket[]> {
  // Build base query — always join options inline
  let query = supabase
    .from("prediction_markets")
    .select("*, options:prediction_options!prediction_options_market_id_fkey(id,market_id,label,pool,created_at)");

  switch (filter) {
    case "trending":
      query = query
        .in("status", ["open", "closed"])
        .order("total_pool", { ascending: false })
        .limit(20);
      break;
    case "ending_soon":
      query = query
        .eq("status", "open")
        .gte("end_time", new Date().toISOString())
        .order("end_time", { ascending: true })
        .limit(20);
      break;
    case "resolved":
      query = query
        .eq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(50);
      break;
    default:
      // "all" — show open + closed (active markets), most recent first
      query = query
        .in("status", ["open", "closed"])
        .order("created_at", { ascending: false })
        .limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getMarkets error:", error.message, error.details);
    return [];
  }

  return (data ?? []).map((row) => {
    const market = mapMarket(row as Record<string, unknown>);
    const rawOptions = (row as Record<string, unknown>).options;
    market.options = Array.isArray(rawOptions)
      ? rawOptions.map((o) => mapOption(o as Record<string, unknown>))
      : [];
    return market;
  });
}

// Dedicated count for "active" (open) markets — used by hero stat widget
export async function getActiveMarketsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("prediction_markets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (error) {
    console.error("getActiveMarketsCount error:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function getMarketDetail(
  marketId: string,
  userId?: string
): Promise<PredictionMarket | null> {
  const { data, error } = await supabase
    .from("prediction_markets")
    .select("*, options:prediction_options!prediction_options_market_id_fkey(id,market_id,label,pool,created_at)")
    .eq("id", marketId)
    .single();

  if (error || !data) {
    if (error) console.error("getMarketDetail error:", error.message);
    return null;
  }

  const market = mapMarket(data as Record<string, unknown>);
  const rawOptions = (data as Record<string, unknown>).options;
  market.options = Array.isArray(rawOptions)
    ? rawOptions.map((o) => mapOption(o as Record<string, unknown>))
    : [];

  if (userId) {
    const { data: posData } = await supabase
      .from("prediction_positions")
      .select("*")
      .eq("user_id", userId)
      .eq("market_id", marketId)
      .maybeSingle();

    market.my_position = posData
      ? mapPosition(posData as Record<string, unknown>)
      : null;
  }

  return market;
}

export async function getPriceHistory(
  marketId: string
): Promise<MarketPriceHistory[]> {
  const { data } = await supabase
    .from("market_price_history")
    .select("*")
    .eq("market_id", marketId)
    .order("recorded_at", { ascending: true })
    .limit(200);

  return (data ?? []).map((row) => ({
    id: String((row as Record<string, unknown>).id ?? ""),
    market_id: String((row as Record<string, unknown>).market_id ?? ""),
    option_id: String((row as Record<string, unknown>).option_id ?? ""),
    probability: Number((row as Record<string, unknown>).probability ?? 0),
    recorded_at: String((row as Record<string, unknown>).recorded_at ?? ""),
  }));
}

export async function getMarketsLeaderboard(): Promise<
  { username: string; avatar_url: string | null; total_payout: number; wins: number }[]
> {
  const { data } = await supabase
    .from("prediction_positions")
    .select("user_id, payout, result")
    .eq("result", "won");

  if (!data || data.length === 0) return [];

  const byUser: Record<string, { total_payout: number; wins: number }> = {};
  for (const row of data) {
    const uid = String((row as Record<string, unknown>).user_id ?? "");
    if (!byUser[uid]) byUser[uid] = { total_payout: 0, wins: 0 };
    byUser[uid].total_payout += Number((row as Record<string, unknown>).payout ?? 0);
    byUser[uid].wins += 1;
  }

  const userIds = Object.keys(byUser);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  return userIds
    .map((uid) => {
      const profile = (profiles ?? []).find(
        (p) => (p as Record<string, unknown>).id === uid
      ) as Record<string, unknown> | undefined;
      return {
        username: String(profile?.username ?? "Anonim"),
        avatar_url: (profile?.avatar_url as string | null) ?? null,
        total_payout: byUser[uid].total_payout,
        wins: byUser[uid].wins,
      };
    })
    .sort((a, b) => b.total_payout - a.total_payout)
    .slice(0, 20);
}

// ─── Admin Actions ─────────────────────────────────────────────────────────────

export async function adminCreateMarket(params: {
  title: string;
  description?: string;
  category: string;
  end_time: string;
  options: string[];
  userId: string;
}): Promise<{ success: boolean; error?: string; market?: PredictionMarket }> {
  if (!params.title.trim()) return { success: false, error: "Başlık gerekli" };
  if (!params.end_time) return { success: false, error: "Bitiş tarihi gerekli" };
  if (params.options.length < 2) return { success: false, error: "En az 2 seçenek gerekli" };
  if (params.options.some((o) => !o.trim())) return { success: false, error: "Seçenek etiketleri boş olamaz" };

  const { data: marketRow, error: mErr } = await supabase
    .from("prediction_markets")
    .insert({
      title: params.title.trim(),
      description: params.description?.trim() || null,
      category: params.category,
      end_time: params.end_time,
      created_by: params.userId,
      status: "open",          // explicit — matches CHECK constraint
      total_pool: 0,
      liquidity_constant: 200,
    })
    .select("*")
    .single();

  if (mErr || !marketRow) {
    console.error("adminCreateMarket insert error:", mErr);
    return { success: false, error: mErr?.message ?? "Tahmin alanı oluşturulamadı" };
  }

  const optionInserts = params.options.map((label) => ({
    market_id: (marketRow as Record<string, unknown>).id as string,
    label: label.trim(),
    pool: 0,
  }));

  const { error: oErr } = await supabase
    .from("prediction_options")
    .insert(optionInserts);

  if (oErr) {
    console.error("adminCreateMarket options error:", oErr);
    return { success: false, error: oErr.message };
  }

  return {
    success: true,
    market: mapMarket(marketRow as Record<string, unknown>),
  };
}

export async function adminCloseMarket(
  marketId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("prediction_markets")
    .update({ status: "closed" })
    .eq("id", marketId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminResolveMarket(
  marketId: string,
  winningOptionId: string
): Promise<{ success: boolean; error?: string; winners?: number; totalPayout?: number }> {
  const { data, error } = await supabase.rpc("market_resolve", {
    p_market_id: marketId,
    p_winning_option_id: winningOptionId,
  });

  if (error) return { success: false, error: error.message };

  const result = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    winners: (result as Record<string, unknown>)?.winners_count as number ?? 0,
    totalPayout: (result as Record<string, unknown>)?.total_payout as number ?? 0,
  };
}

// ─── User Bet Action ───────────────────────────────────────────────────────────

export async function placeBet(
  marketId: string,
  optionId: string,
  amount: number
): Promise<{ success: boolean; error?: string; lockedProbability?: number; newCredits?: number }> {
  const { data, error } = await supabase.rpc("market_place_bet", {
    p_market_id: marketId,
    p_option_id: optionId,
    p_amount: amount,
  });

  if (error) return { success: false, error: error.message };

  const result = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    lockedProbability: (result as Record<string, unknown>)?.locked_probability as number,
    newCredits: (result as Record<string, unknown>)?.new_credits as number,
  };
}

export async function getUserPositions(
  userId: string
): Promise<PredictionPosition[]> {
  const { data } = await supabase
    .from("prediction_positions")
    .select("*, option:prediction_options(label,pool)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const pos = mapPosition(row as Record<string, unknown>);
    const optRaw = (row as Record<string, unknown>).option;
    if (optRaw && typeof optRaw === "object") {
      pos.option = mapOption(optRaw as Record<string, unknown>);
    }
    return pos;
  });
}
