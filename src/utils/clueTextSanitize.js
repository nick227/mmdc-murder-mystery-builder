/** Player-facing bundle text: tight word limits (murder canon lives in murder_canon, not prose). */

export const MAX_BUNDLE_EVIDENCE_WORDS = 100;
export const MAX_BUNDLE_PUZZLE_WORDS = 100;
export const MAX_STANDALONE_CLUE_WORDS = 100;

export function truncateToWordCount(text, maxWords) {
  const n = Math.max(1, Number(maxWords) || 100);
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= n) {
    return String(text || '').trim();
  }
  return `${words.slice(0, n).join(' ')}…`;
}

/**
 * Evidence + puzzle cards in puzzle bundles (player-visible).
 */
export function truncateBundleCardContents(cardContents, cardType) {
  const max =
    cardType === 'puzzle' ? MAX_BUNDLE_PUZZLE_WORDS : MAX_BUNDLE_EVIDENCE_WORDS;
  return truncateToWordCount(cardContents, max);
}
