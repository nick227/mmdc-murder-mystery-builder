import { callJson } from '../llm/client.js';
import { buildItemsPrompt } from '../prompts/itemsPrompt.js';
import { cardsArraySchema } from '../schemas/cardsSchema.js';
import { pushCards } from '../utils/cards.js';

export async function itemAgent(context) {
  const prompt = buildItemsPrompt({
    storyBlurb: context.story_blurb,
    trails: context.trails,
    narratives: context.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'items',
    schema: cardsArraySchema(4, 12)
  });

  const cards = (result.cards || []).map((c, i) => ({
    ...c,
    act: c.act ?? ((i % 3) + 1)
  }));

  return pushCards(context, 'item', cards);
}
