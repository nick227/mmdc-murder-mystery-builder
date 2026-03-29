import { callJson } from '../llm/client.js';
import { buildItemsPrompt } from '../prompts/itemsPrompt.js';
import { cardsArraySchema } from '../schemas/cardsSchema.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { buildEvidenceSignature } from '../utils/evidenceFacts.js';
import { buildFactLedger, findSameDirectionConflicts, hasDuplicateSignature } from '../utils/factLedger.js';

const MIN_ITEM_COUNT = 4;
const MAX_ATTEMPTS = 3;

function cloneLedger(ledger) {
  return {
    signatures: new Set(ledger.signatures),
    pressureEntries: [...ledger.pressureEntries]
  };
}

function filterItemCards(rawCards, context, ledger) {
  const nextLedger = cloneLedger(ledger);
  const acceptedCards = [];
  const rejected = [];

  for (const [index, raw] of (rawCards || []).entries()) {
    const card = {
      ...raw,
      act: raw.act ?? ((index % 3) + 1)
    };
    const text = `${card.card_title || ''} ${card.card_contents || ''}`.trim();
    const signature = buildEvidenceSignature(card, context);

    if (hasDuplicateSignature(signature, nextLedger)) {
      rejected.push({
        card_title: card.card_title,
        signature,
        reason: 'duplicate_fact_signature'
      });
      continue;
    }

    const conflicts = findSameDirectionConflicts(signature, text, nextLedger, context);
    if (conflicts.length) {
      rejected.push({
        card_title: card.card_title,
        signature,
        reason: 'same_direction_pressure_conflict',
        conflicts
      });
      continue;
    }

    if (signature) {
      nextLedger.signatures.add(signature);
    }
    acceptedCards.push(card);
  }

  return {
    acceptedCards,
    rejected
  };
}

export async function itemAgent(context) {
  context.debug ??= {};
  context.debug.rejection_log ??= [];
  context.debug.warning_log ??= [];

  let acceptedCards = [];
  let bestResult = { acceptedCards: [], rejected: [] };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const prompt = buildItemsPrompt({
      storyBlurb: getStoryBlurb(context),
      trails: context.trails,
      narratives: context.narratives,
      characters: getCharacterCards(context.cards),
      people: getCardsByType(context.cards, 'person'),
      locations: getCardsByType(context.cards, 'location'),
      existingItems: getCardsByType(context.cards, 'item'),
      rejectionReasons: context.debug.rejection_log
        .filter((entry) => entry?.stage === 'item_agent')
        .map((entry) => entry.reason)
        .slice(-4)
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'items',
      schema: cardsArraySchema(4, 12)
    });

    const ledger = buildFactLedger(context);
    const filtered = filterItemCards(result.cards || [], context, ledger);
    acceptedCards = filtered.acceptedCards;
    if (acceptedCards.length > bestResult.acceptedCards.length) {
      bestResult = filtered;
    }

    if (acceptedCards.length >= MIN_ITEM_COUNT) {
      break;
    }

    context.debug.rejection_log.push({
      stage: 'item_agent',
      attempt,
      reason: 'duplicate_or_same_direction_items_removed',
      remaining_count: acceptedCards.length,
      rejected_cards: filtered.rejected.slice(0, 6)
    });
  }

  if (acceptedCards.length < MIN_ITEM_COUNT) {
    context.debug.warning_log.push({
      stage: 'item_agent',
      reason: 'fact_signature_filter_exhausted',
      message: `item_agent kept only ${bestResult.acceptedCards.length} items after fact-signature rejection; using best-effort output.`,
      accepted_count: bestResult.acceptedCards.length,
      rejected_cards: bestResult.rejected.slice(0, 6)
    });
    acceptedCards = bestResult.acceptedCards;
  }

  return pushCards(context, 'item', acceptedCards);
}
