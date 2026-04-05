export const DEFAULT_CARDS_PER_PLAYER = 5;
export const DEFAULT_CLUES_PER_PLAYER = 3;
export const DEFAULT_PUZZLE_COUNT = 4;
export const DEFAULT_PROFILE_CARDS_PER_CHARACTER = 3;
export const MIN_ENABLED_PUZZLE_COUNT = 4;

export function coerceNonNegativeInt(value, fallback) {
  const n = typeof value === 'string' && !value.trim()
    ? NaN
    : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  const int = Math.floor(n);
  return int >= 0 ? int : fallback;
}

export function coercePuzzleCount(value, fallback = DEFAULT_PUZZLE_COUNT) {
  const count = coerceNonNegativeInt(value, fallback);
  if (count === 0) {
    return 0;
  }
  return Math.max(count, MIN_ENABLED_PUZZLE_COUNT);
}
