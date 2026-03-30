import { callJson } from '../llm/client.js';
import { buildFinalEditorPrompt } from '../prompts/finalEditorPrompt.js';
import { getStoryBlurb } from '../utils/context.js';

const GAME_CARD_TYPES = new Set(['performance', 'conversation', 'search', 'flavor', 'accusation', 'alibi', 'trade', 'revelation']);

export function applyFinalEditorResult(existingCards, editedCards) {
  const safeExistingCards = Array.isArray(existingCards) ? existingCards : [];
  const safeEditedCards = Array.isArray(editedCards) ? editedCards : [];

  if (safeEditedCards.length !== safeExistingCards.length) {
    throw new Error(`final_editor_agent must preserve card count (${safeExistingCards.length} -> ${safeEditedCards.length})`);
  }

  return safeExistingCards.map((card, index) => {
    const edited = safeEditedCards[index] || {};
    if (card?.bundle_id) {
      return { ...card };
    }
    const nextAct = edited.act === 1 || edited.act === 2 || edited.act === 3
      ? edited.act
      : (card.act === 1 || card.act === 2 || card.act === 3 ? card.act : ((index % 3) + 1));
    const nextGameCardType = GAME_CARD_TYPES.has(String(edited?.game_card_type || '').trim())
      ? String(edited.game_card_type).trim()
      : card?.game_card_type;

    return {
      ...card,
      card_title: String(edited.card_title || card.card_title || '').trim(),
      card_contents: String(edited.card_contents || card.card_contents || '').trim(),
      act: nextAct,
      ...(nextGameCardType !== undefined ? { game_card_type: nextGameCardType } : {})
    };
  });
}

export async function finalEditorAgent(context) {
  const existingCards = Array.isArray(context.cards) ? context.cards : [];

  if (process.env.SMOKE_MODE === 'true') {
    return context;
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems: existingCards.length,
        maxItems: existingCards.length,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['card_title', 'card_contents', 'act', 'game_card_type'],
          properties: {
            card_title: { type: 'string' },
            card_contents: { type: 'string' },
            act: { type: 'integer', enum: [1, 2, 3] },
            game_card_type: {
              type: ['string', 'null'],
              enum: ['performance', 'conversation', 'search', 'flavor', 'accusation', 'alibi', 'trade', 'revelation', null]
            }
          }
        }
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
    try {
      context.cards = applyFinalEditorResult(existingCards, result.cards);
    } catch (error) {
      context.debug.warning_log.push({
        stage: 'final_editor',
        reason: 'final_editor_contract_fallback',
        message: error.message
      });
      context.cards = existingCards;
    }
  }

  return context;
}
