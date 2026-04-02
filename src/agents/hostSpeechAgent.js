import { callJson } from '../llm/client.js';
import { buildHostSpeechPrompt } from '../prompts/hostSpeechPrompt.js';
import { actedSimpleCardsSchema } from '../schemas/simpleCardsSchema.js';
import { getCardsByType, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function hostSpeechAgent(context) {
  const prompt = buildHostSpeechPrompt({
    storyBlurb: getStoryBlurb(context),
    narratives: context.narratives,
    locations: getCardsByType(context.cards, 'location')
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'host_speech',
    schema: actedSimpleCardsSchema
  });

  const cards = (result.cards || []).map((c, i) => ({
    ...c,
    act: c.act ?? (i % 3) + 1
  }));

  return pushCards(context, 'host_speech', cards);
}
