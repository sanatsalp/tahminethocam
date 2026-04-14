// lib/markets-types.ts
// Type definitions for Campus Prediction Markets.
// Completely separate from the existing prediction/match system.

export type MarketStatus = "open" | "closed" | "resolved";
export type PositionResult = "pending" | "won" | "lost";

export interface PredictionMarket {
  id: string;
  title: string;
  description?: string;
  category: string;
  end_time: string;
  status: MarketStatus;
  winning_option_id?: string | null;
  total_pool: number;
  liquidity_constant: number;
  created_by?: string | null;
  created_at: string;
  // joined
  options?: PredictionOption[];
  my_position?: PredictionPosition | null;
}

export interface PredictionOption {
  id: string;
  market_id: string;
  label: string;
  pool: number;
  created_at: string;
}

export interface PredictionPosition {
  id: string;
  user_id: string;
  market_id: string;
  option_id: string;
  amount: number;
  locked_probability: number;
  payout?: number | null;
  result: PositionResult;
  created_at: string;
  // joined
  option?: PredictionOption;
}

export interface MarketPriceHistory {
  id: string;
  market_id: string;
  option_id: string;
  probability: number;
  recorded_at: string;
}

// ─── Pricing Utilities ────────────────────────────────────────────────────────

/**
 * Compute smoothed probability for a single option using liquidity-constant model.
 *
 * adjusted_option = option.pool + L
 * adjusted_total  = total_pool  + (num_options × L)
 * probability     = adjusted_option / adjusted_total
 *
 * At market launch (all pools = 0, L = 200, binary):
 *   probability = 200 / 400 = 0.50  ← perfectly balanced start
 */
export function computeProbability(
  option: PredictionOption,
  allOptions: PredictionOption[],
  liquidityConstant = 200
): number {
  const L = liquidityConstant;
  const n = allOptions.length;
  const totalPool = allOptions.reduce((sum, o) => sum + o.pool, 0);

  const adjOption = option.pool + L;
  const adjTotal = totalPool + n * L;

  return adjOption / adjTotal;
}

/** Display as percentage string e.g. "62.4%" */
export function formatProbability(prob: number): string {
  return (prob * 100).toFixed(1) + "%";
}

/**
 * Estimate payout for a new bet given current option state.
 *
 * We approximate using the current new-state probability
 * (after hypothetically adding amount to the option pool).
 * Actual payout is proportional-pool at resolve time:
 *   payout = (your_amount / winning_pool) × total_pool
 */
export function estimatePayout(
  option: PredictionOption,
  allOptions: PredictionOption[],
  betAmount: number
): number {
  const totalPool = allOptions.reduce((sum, o) => sum + o.pool, 0);
  const newOptionPool = option.pool + betAmount;
  const newTotalPool = totalPool + betAmount;
  if (newOptionPool === 0) return 0;
  return Math.floor((betAmount / newOptionPool) * newTotalPool);
}

export const MARKET_CATEGORIES = [
  "Spor",
  "Akademik",
  "Kampüs",
  "Teknoloji",
  "Eğlence",
  "Diğer",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];
