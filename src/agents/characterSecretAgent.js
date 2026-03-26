import { callJson } from '../llm/client.js';
import { buildCharacterSecretsPrompt } from '../prompts/characterSecretsPrompt.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 1,
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

export async function characterSecretAgent(context) {
  const characters = getCharacterCards(context.cards).filter((c) => c.card_title?.trim());
  const secrets = [];

  for (const character of characters) {
    if (!character.card_id) {
      throw new Error(`character_secret_agent requires card_id on character "${character.card_title}"`);
    }

    const prompt = buildCharacterSecretsPrompt({
      storyBlurb: getStoryBlurb(context),
      characterName: character.card_title
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'character_secrets',
      schema
    });

    const cards = (result.cards || []).map((c) => ({
      card_type: 'secret',
      card_title: c.card_title,
      card_contents: c.card_contents,
      linked_character_id: character.card_id
    }));

    secrets.push(...cards);

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  pushCards(context, 'secret', secrets);

  const secretCount = getCardsByType(context.cards, 'secret').length;
  if (secretCount < characters.length) {
    throw new Error(`character_secret_agent produced ${secretCount} secrets for ${characters.length} characters`);
  }

  return context;
}
