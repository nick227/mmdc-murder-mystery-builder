import { callJson } from '../llm/client.js';
import { buildCharacterProfilePrompt } from '../prompts/characterProfilesPrompt.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { DEFAULT_PROFILE_CARDS_PER_CHARACTER } from '../config/generationDefaults.js';

function baseName(value) {
  return String(value || '').split(',')[0].trim();
}

export async function characterProfileAgent(context) {
  const characters = getCharacterCards(context.cards);
  if (!characters.length) {
    return context;
  }

  const storyBlurb = getStoryBlurb(context);
  const profileCount = Number.isFinite(context?.profileCardsPerCharacter)
    ? Math.max(0, Math.floor(context.profileCardsPerCharacter))
    : DEFAULT_PROFILE_CARDS_PER_CHARACTER;
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems: profileCount,
        maxItems: profileCount,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['card_title', 'card_contents'],
          properties: {
            card_title: { type: 'string' },
            card_contents: { type: 'string' }
          }
        }
      }
    }
  };

  const profileCards = [];
  for (const targetCharacter of characters) {
    const linkedCharacter = baseName(targetCharacter?.card_title) || String(targetCharacter?.card_title || '').trim();
    const prompt = buildCharacterProfilePrompt({
      storyBlurb,
      roster: characters,
      targetCharacter,
      cardCount: profileCount
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'character_profile',
      schema
    });

    if (profileCount > 0) {
      const cards = Array.isArray(result?.cards) ? result.cards : [];
      for (const card of cards) {
        profileCards.push({
          card_type: 'character_profile',
          card_title: card?.card_title,
          card_contents: String(card?.card_contents || '').trim(),
          linked_character: linkedCharacter,
          act: 1
        });
      }
    }
  }

  context.cards = (Array.isArray(context.cards) ? context.cards : [])
    .filter((card) => card?.card_type !== 'character_profile');
  pushCards(context, 'character_profile', profileCards);

  return context;
}
