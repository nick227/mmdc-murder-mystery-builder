import { callJson } from '../llm/client.js';
import { buildCharacterProfilesPrompt } from '../prompts/characterProfilesPrompt.js';
import { cardsArraySchema } from '../schemas/cardsSchema.js';
import { pushCards } from '../utils/cards.js';

export async function characterProfileAgent(context) {
  const count = context.playerCount ?? 4;

  const prompt = buildCharacterProfilesPrompt({
    storyBlurb: context.story_blurb,
    trails: context.trails,
    playerCount: count,
    narratives: context.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'character_profiles',
    schema: cardsArraySchema(count, count)
  });

  return pushCards(context, 'character', (result.cards || []).map((c) => ({ ...c, act: 1 })));
}
