
import { callJson } from '../llm/client.js';
import { buildCharactersBuilderPrompt } from '../prompts/charactersBuilderPrompt.js';
import { characterProfileAgent } from './characterProfileAgent.js';
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

export async function charactersBuilderAgent(context) {

  const prompt = buildCharactersBuilderPrompt({
    storyBlurb: context.story_blurb,
    playerCount: context.player_count
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'characters_builder',
    schema
  });

  const cards = (result.cards || []).map(c => ({
    card_type: 'character',
    card_title: c.card_title,
    card_contents: c.card_contents
  }));

  pushCards(context,'character',cards);

  for (const card of cards) {

    const childContext = {
      ...context,
      character_seed: card
    };

    await characterProfileAgent(childContext);

    await new Promise(r => setTimeout(r,1000));
  }

  return context;
}
