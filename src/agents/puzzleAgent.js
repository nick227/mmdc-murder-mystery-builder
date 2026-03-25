import { callJson } from '../llm/client.js';
import { buildPuzzlePrompt } from '../prompts/puzzlePrompt.js';
import { actedCardsArraySchema } from '../schemas/cardsSchema.js';
import { pushCards } from '../utils/cards.js';

export async function puzzleAgent(context) {
  const prompt = buildPuzzlePrompt({
    storyBlurb: context.story_blurb,
    trails: context.trails,
    narratives: context.narratives,
    murder_truth: context.murder_truth,
    fortune_truth: context.fortune_truth,
    playerCount: context.playerCount
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'puzzle_cards',
    schema: actedCardsArraySchema(3, 6)
  });

  return pushCards(context, 'puzzle', result.cards || []);
}
