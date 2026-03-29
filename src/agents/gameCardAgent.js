import { callJson } from '../llm/client.js';
import { buildGameCardsPrompt } from '../prompts/gameCardsPrompt.js';
import { actedCardsArraySchema } from '../schemas/cardsSchema.js';
import { pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function gameCardAgent(context) {
  const prompt = buildGameCardsPrompt({
    storyBlurb: getStoryBlurb(context),
    trails: context.trails,
    playerCount: context.playerCount,
    narratives: context.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'game_cards',
    schema: actedCardsArraySchema(Math.max((context.playerCount || 4) * 2, 8), Math.max((context.playerCount || 4) * 2 + 2, 10))
  });

  return pushCards(context, 'game_card', result.cards || []);
}
