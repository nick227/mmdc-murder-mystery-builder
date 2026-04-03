import { getCardsByType } from './cards.js';

/**
 * Inventory for host importers. Treasure hunt uses clue_type "treasure"; the canonical macguffin
 * is one item with is_treasure true (see treasure_item_agent).
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
  const treasureItemCount = getCardsByType(cards, 'item').filter((c) => c.is_treasure === true).length;

  return {
    counts_by_card_type: counts,
    treasure_clue_count: treasureClueCount,
    treasure_item_count: treasureItemCount
  };
}
