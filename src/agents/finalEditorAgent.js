import { callJson } from '../llm/client.js';
import { buildFinalEditorPrompt } from '../prompts/finalEditorPrompt.js';
import { finalCardsSchema } from '../schemas/finalCardsSchema.js';
import { getStoryBlurb } from '../utils/context.js';

export function applyFinalEditorResult(existingCards, editedCards) {
  const safeExistingCards = Array.isArray(existingCards) ? existingCards : [];
  const safeEditedCards = Array.isArray(editedCards) ? editedCards : [];

  if (safeEditedCards.length !== safeExistingCards.length) {
    throw new Error(`final_editor_agent must preserve card count (${safeExistingCards.length} -> ${safeEditedCards.length})`);
  }

  const resultIds = safeEditedCards.map((card) => card?.card_id).filter(Boolean);
  const existingIds = safeExistingCards.map((card) => card?.card_id).filter(Boolean);
  const hasDuplicateIds = new Set(resultIds).size !== resultIds.length;
  if (hasDuplicateIds) {
    throw new Error('final_editor_agent returned duplicate card_id values');
  }
  if (resultIds.length !== existingIds.length || resultIds.some((id) => !existingIds.includes(id))) {
    throw new Error('final_editor_agent must preserve the exact card_id set');
  }

  const editedById = new Map(safeEditedCards.map((card) => [card.card_id, card]));

  return safeExistingCards.map((card, index) => {
    const edited = editedById.get(card.card_id) || {};
    const nextAct = edited.act === 1 || edited.act === 2 || edited.act === 3
      ? edited.act
      : (card.act === 1 || card.act === 2 || card.act === 3 ? card.act : ((index % 3) + 1));

    return {
      ...card,
      card_title: String(edited.card_title || card.card_title || '').trim(),
      card_contents: String(edited.card_contents || card.card_contents || '').trim(),
      act: nextAct
    };
  });
}

export async function finalEditorAgent(context) {
  const existingCards = Array.isArray(context.cards) ? context.cards : [];

  if (process.env.SMOKE_MODE === 'true') {
    return context;
  }

  const schema = {
    ...finalCardsSchema,
    properties: {
      ...finalCardsSchema.properties,
      cards: {
        ...finalCardsSchema.properties.cards,
        minItems: existingCards.length,
        maxItems: existingCards.length
      }
    }
  };

  const prompt = buildFinalEditorPrompt({
    storyBlurb: getStoryBlurb(context),
    trails: context.trails,
    narratives: context.narratives,
    ambiguityNotes: context.ambiguity_notes,
    cards: existingCards
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'final_cards',
    schema
  });

  if (Array.isArray(result.cards)) {
    context.cards = applyFinalEditorResult(existingCards, result.cards);
  }

  return context;
}
