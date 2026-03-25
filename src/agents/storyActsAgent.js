import { callJson } from '../llm/client.js';
import { buildStoryActsPrompt } from '../prompts/storyActsPrompt.js';
import { simpleCardsSchema } from '../schemas/simpleCardsSchema.js';
import { pushCards } from '../utils/cards.js';

export async function storyActsAgent(context) {
  const prompt = buildStoryActsPrompt({
    storyBlurb: context.story_blurb,
    narratives: context.narratives,
    characters: context.characters
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'story_acts',
    schema: simpleCardsSchema
  });

  const cards = (result.cards || []).map((c, i) => ({
    ...c,
    act: c.act ?? (i + 1) // 1,2,3
  }));

  return pushCards(context, 'story_act', cards);
}
