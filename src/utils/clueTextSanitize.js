/** Player-facing bundle text: no internal canon labels; tight word limits. */

export const MAX_BUNDLE_EVIDENCE_WORDS = 100;
export const MAX_BUNDLE_PUZZLE_WORDS = 100;
export const MAX_STANDALONE_CLUE_WORDS = 100;

/** Remove internal labels only; keep the victim/location text so canon substring checks still pass. */
export function stripCanonicalMetaLines(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = lines.map((line) =>
    String(line)
      .replace(/^\s*Canonical\s+victim\s*:\s*/i, '')
      .replace(/^\s*Canonical\s+location\s*:\s*/i, '')
  );
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

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
export function sanitizeBundleCardContents(cardContents, cardType) {
  let t = stripCanonicalMetaLines(cardContents);
  const max =
    cardType === 'puzzle' ? MAX_BUNDLE_PUZZLE_WORDS : MAX_BUNDLE_EVIDENCE_WORDS;
  t = truncateToWordCount(t, max);
  return t;
}
