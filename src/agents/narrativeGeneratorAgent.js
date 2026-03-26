import { callJson } from '../llm/client.js';
import { buildNarrativesPrompt } from '../prompts/narrativesPrompt.js';
import { narrativesSchema } from '../schemas/narrativesSchema.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function narrativeGeneratorAgent(context) {
  const prompt = buildNarrativesPrompt({
    storyBlurb: getStoryBlurb(context),
    solution: context.solution,
    trails: context.trails,
    playerCount: context.playerCount,
    characters: getCharacterCards(context.cards)
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'suspect_narratives',
    schema: narrativesSchema
  });

  context.narratives = result.narratives || result;
  return context;
}
