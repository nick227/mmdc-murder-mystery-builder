import { callJson } from '../llm/client.js';
import { buildStoryActsPrompt } from '../prompts/storyActsPrompt.js';
import { simpleCardsSchema } from '../schemas/simpleCardsSchema.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function storyActsAgent(context) {
  const prompt = buildStoryActsPrompt({
    storyBlurb: getStoryBlurb(context),
    narratives: context.narratives,
    characters: getCharacterCards(context.cards)
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'story_acts',
    schema: simpleCardsSchema
  });

  const cards = (result.cards || []).map((c, i) => ({
    ...c,
    act: c.act ?? (i + 1)
  }));

  return pushCards(context, 'story_act', cards);
}
