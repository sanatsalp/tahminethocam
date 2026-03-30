export const TOWER_GAME = {
  MAX_LEVEL: 5,
  TILE_COUNT: 3,
  MAX_DAILY_GAMES: 3,
  MAX_BET: 50,
  MULTIPLIERS: [1.0, 1.40, 2.00, 2.80, 4.00, 5.50],
} as const;

export function computeTowerMultiplier(correctLevel: number) {
  return TOWER_GAME.MULTIPLIERS[correctLevel] ?? 1.0;
}

