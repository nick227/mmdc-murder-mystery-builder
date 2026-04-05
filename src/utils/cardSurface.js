import { getCardsByType } from './cards.js';

export function buildCardSurface(context) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  const counts = {};
  for (const card of cards) {
    const t = String(card?.card_type || 'unknown').trim() || 'unknown';
    counts[t] = (counts[t] || 0) + 1;
  }
  const solutionCards = getCardsByType(cards, 'solution');
  const solutionRevealCount = solutionCards.filter((c) => c?.reveal === 'host_reveal').length;
  const solutionRoleCounts = solutionCards.reduce((acc, card) => {
    const role = String(card?.role || '').trim().toLowerCase() || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return {
    counts_by_card_type: counts,
    solution_reveal_count: solutionRevealCount,
    solution_roles: solutionRoleCounts
  };
}
