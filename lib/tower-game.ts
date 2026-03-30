export const TOWER_GAME = {
  MAX_LEVEL: 5,
  TILE_COUNT: 3,
  MAX_DAILY_GAMES: 3,
  MAX_BET: 50,
  MULTIPLIER_STEP: 1.25,
  MULTIPLIER_CAP: 2.0,
} as const;

export function computeTowerMultiplier(correctLevel: number) {
  const raw = Math.pow(TOWER_GAME.MULTIPLIER_STEP, correctLevel);
  return Math.min(TOWER_GAME.MULTIPLIER_CAP, raw);
}

