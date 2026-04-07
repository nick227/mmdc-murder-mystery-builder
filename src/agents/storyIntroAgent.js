import { callJson } from '../llm/client.js';
import { buildIntroPrompt } from '../prompts/buildIntroPrompt.js';
import { cardsArraySchema } from '../schemas/cardsSchema.js';
import { pushCards } from '../utils/cards.js';

export async function storyIntroAgent(context) {
  const prompt = buildIntroPrompt(context);

  const result = await callJson({
    ...prompt,
    schemaName: 'story_intro',
    schema: cardsArraySchema
  });

  pushCards(context, 'story_intro', result.cards);

  console.log('Story blurb:', context.storyBlurb);

  return context;
}
