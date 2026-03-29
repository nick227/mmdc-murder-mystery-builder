import { callJson } from '../llm/client.js';
import { buildCharacterProfilePrompt } from '../prompts/characterProfilesPrompt.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function characterProfileAgent(context) {
  const characters = getCharacterCards(context.cards);
  if (!characters.length) {
    return context;
  }

  const storyBlurb = getStoryBlurb(context);
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['card_id', 'card_title', 'card_contents'],
    properties: {
      card_id: { type: 'string' },
      card_title: { type: 'string' },
      card_contents: { type: 'string' }
    }
  };

  const refinedCards = [];
  for (const targetCharacter of characters) {
    const prompt = buildCharacterProfilePrompt({
      storyBlurb,
      roster: characters,
      targetCharacter
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'character_profile',
      schema
    });

    refinedCards.push({
      ...targetCharacter,
      card_contents: String(result.card_contents || '').trim(),
      act: 1
    });
  }

  const refinedById = new Map(refinedCards.map((card) => [card.card_id, card]));
  context.cards = context.cards.map((card) => {
    if (card?.card_type !== 'character' || !card?.card_id) {
      return card;
    }
    return refinedById.get(card.card_id) || card;
  });

  return context;
}
