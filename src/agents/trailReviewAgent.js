import { callJson } from '../llm/client.js';
import { buildTrailReviewPrompt } from '../prompts/trailReviewPrompt.js';
import { trailsSchema } from '../schemas/trailsSchema.js';

export async function trailReviewAgent(context) {
  if (!context.trails?.length) {
    throw new Error('No trails to review');
  }

  const prompt = buildTrailReviewPrompt({
    storyBlurb: context.story_blurb,
    murder_truth: context.murder_truth,
    fortune_truth: context.fortune_truth,
    trails: context.trails
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'reviewed_trails',
    schema: trailsSchema
  });

  context.trails = result.trails || context.trails;
  return context;
}
