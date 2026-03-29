import { canonicalizeEvidenceCard } from '../utils/evidenceFacts.js';

export async function evidenceCanonicalizerAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];

  context.cards = cards.map((card) => {
    if (!['clue', 'item'].includes(card?.card_type)) {
      return card;
    }
    if (card?.bundle_id) {
      return card;
    }

    return {
      ...card,
      derived_facts: canonicalizeEvidenceCard(card, context)
    };
  });

  return context;
}
