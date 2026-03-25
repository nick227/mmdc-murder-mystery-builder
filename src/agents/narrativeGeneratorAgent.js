import { callJson } from '../llm/client.js';
import { buildNarrativesPrompt } from '../prompts/narrativesPrompt.js';
import { narrativesSchema } from '../schemas/narrativesSchema.js';

export async function narrativeGeneratorAgent(context) {
  const prompt = buildNarrativesPrompt({
    storyBlurb: context.story_blurb,
    murder_truth: context.murder_truth,
    fortune_truth: context.fortune_truth,
    trails: context.trails,
    playerCount: context.playerCount
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'suspect_narratives',
    schema: narrativesSchema
  });

  context.narratives = result.narratives || result;
  return context;
}
