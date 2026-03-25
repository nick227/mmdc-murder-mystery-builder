
import { callJson } from '../llm/client.js';
import { buildCharacterSecretsPrompt } from '../prompts/characterSecretsPrompt.js';
import { pushCards } from '../utils/cards.js';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['card_title','card_contents'],
        properties: {
          card_title: { type: 'string' },
          card_contents: { type: 'string' }
        }
      }
    }
  }
};

export async function characterSecretAgent(context) {

  const characters = context.character_profiles || [];

  const secrets = [];

  for (const character of characters) {

    const prompt = buildCharacterSecretsPrompt({
      storyBlurb: context.story_blurb,
      character
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'character_secrets',
      schema
    });

    const cards = (result.cards || []).map(c => ({
      card_type: 'secret',
      card_title: c.card_title,
      card_contents: c.card_contents,
      linked_character: character.card_title
    }));

    secrets.push(...cards);

    await new Promise(r => setTimeout(r, 1500));
  }

  pushCards(context, 'secret', secrets);

  return context;
}
