import { callJson } from '../llm/client.js';
import { buildCharacterProfilesPrompt } from '../prompts/characterProfilesPrompt.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

function schemaForCount(count) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['card_id', 'card_title', 'card_contents'],
          properties: {
            card_id: { type: 'string' },
            card_title: { type: 'string' },
            card_contents: { type: 'string' }
          }
        }
      }
    }
  };
}

function refineCharactersInPlace(allCards, refinedCards) {
  const refinedById = new Map(
    (Array.isArray(refinedCards) ? refinedCards : [])
      .map((c) => [c?.card_id, c])
      .filter(([id]) => typeof id === 'string' && id.length)
  );

  return (Array.isArray(allCards) ? allCards : []).map((card) => {
    if (card?.card_type !== 'character' || !card?.card_id) {
      return card;
    }

    const refined = refinedById.get(card.card_id);
    if (!refined) {
      return card;
    }

    // Strict invariants: preserve id + title; overwrite contents only.
    return {
      ...card,
      card_contents: String(refined.card_contents || '').trim()
    };
  });
}

export async function characterProfileRefinementAgent(context) {
  const characters = getCharacterCards(context.cards);
  const count = characters.length;

  if (!count) {
    return context;
  }

  const prompt = buildCharacterProfilesPrompt({
    storyBlurb: getStoryBlurb(context),
    characters
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'character_profile_refinement',
    schema: schemaForCount(count)
  });

  context.cards = refineCharactersInPlace(context.cards, result.cards);
  return context;
}

