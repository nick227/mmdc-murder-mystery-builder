import { callJson } from '../llm/client.js';
import { buildHostSpeechPrompt } from '../prompts/hostSpeechPrompt.js';
import { simpleCardsSchema } from '../schemas/simpleCardsSchema.js';
import { pushCards } from '../utils/cards.js';

export async function hostSpeechAgent(context) {
  const prompt = buildHostSpeechPrompt({
    storyBlurb: context.story_blurb,
    narratives: context.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'host_speech',
    schema: simpleCardsSchema
  });

  const cards = (result.cards || []).map((c, i) => ({
    ...c,
    act: c.act ?? (i % 3) + 1
  }));

  return pushCards(context, 'host_speech', cards);
}
