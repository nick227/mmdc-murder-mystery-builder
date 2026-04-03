import { getCardsByType } from './cards.js';

/**
 * Treasure hunt: clue cards with clue_type "treasure". Finale reveal: card_type "treasure"
 * (treasure_item_agent), usually act 3 + hidden_until_solved for host unlock.
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
  const treasureRevealCount = getCardsByType(cards, 'treasure').length;

  return {
    counts_by_card_type: counts,
    treasure_clue_count: treasureClueCount,
    treasure_reveal_card_count: treasureRevealCount
  };
}
