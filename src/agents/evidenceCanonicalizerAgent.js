import { canonicalizeEvidenceCard } from '../utils/evidenceFacts.js';
import { isEvidenceLedgerCard } from '../utils/cards.js';

export async function evidenceCanonicalizerAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];

  context.cards = cards.map((card) => {
    if (!isEvidenceLedgerCard(card)) {
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
