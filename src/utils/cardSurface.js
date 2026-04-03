import { getCardsByType } from './cards.js';

/** Not emitted by `src/pipeline/steps/index.js` unless those agents are added later. */
export const DEFAULT_PIPELINE_OPTIONAL_CARD_TYPES = ['secret', 'host_speech'];

/**
 * Inventory for host importers / dev checks. Treasure hunt is clue cards with clue_type "treasure",
 * not card_type "treasure".
 */
export function buildCardSurface(context) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const counts = {};
  for (const card of cards) {
    const t = String(card?.card_type || 'unknown').trim() || 'unknown';
    counts[t] = (counts[t] || 0) + 1;
  }
  const treasureClueCount = cards.filter(
    (c) => c?.card_type === 'clue' && String(c?.clue_type || '').trim().toLowerCase() === 'treasure'
  ).length;

  return {
    counts_by_card_type: counts,
    treasure_clue_count: treasureClueCount,
    optional_card_types_not_in_default_pipeline: DEFAULT_PIPELINE_OPTIONAL_CARD_TYPES.reduce(
      (acc, t) => {
        acc[t] = getCardsByType(cards, t).length;
        return acc;
      },
      {}
    )
  };
}
