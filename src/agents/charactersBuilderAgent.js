import { callJson } from '../llm/client.js';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

function buildSchema(playerCount) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems: playerCount,
        maxItems: playerCount,
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
}

export async function charactersBuilderAgent(context) {
  const playerCount = context.playerCount ?? 4;

  const prompt = buildCharactersBuilderPrompt({
    storyBlurb: getStoryBlurb(context),
    playerCount
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'characters_builder',
    schema: buildSchema(playerCount)
  });

  const cards = (result.cards || []).map((c) => ({
    card_type: 'character',
    card_title: c.card_title,
    card_contents: c.card_contents
  }));

  pushCards(context, 'character', cards);

  const characterCount = getCharacterCards(context.cards).length;
  if (characterCount !== playerCount) {
    throw new Error(`characters_builder_agent produced ${characterCount} characters for playerCount=${playerCount}`);
  }

  return context;
}
