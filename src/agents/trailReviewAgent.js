import { callJson } from '../llm/client.js';
import { buildTrailReviewPrompt } from '../prompts/trailReviewPrompt.js';
import { trailsSchema } from '../schemas/trailsSchema.js';
import { getStoryBlurb } from '../utils/context.js';

const trailReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'problems', 'roles', 'trails'],
  properties: {
    pass: { type: 'boolean' },
    problems: {
      type: 'array',
      minItems: 0,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'message'],
        properties: {
          type: { type: 'string' },
          message: { type: 'string' }
        }
      }
    },
    roles: {
      type: 'object',
      additionalProperties: false,
      required: ['red_herring', 'killer_aligned', 'ambiguous'],
      properties: {
        red_herring: { type: 'boolean' },
        killer_aligned: { type: 'boolean' },
        ambiguous: { type: 'boolean' }
      }
    },
    trails: trailsSchema.properties.trails
  }
};

export async function trailReviewAgent(context) {
  if (!context.trails?.length) {
    throw new Error('No trails to review');
  }

  const prompt = buildTrailReviewPrompt({
    storyBlurb: getStoryBlurb(context),
    solution: context.solution,
    trails: context.trails
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'reviewed_trails',
    schema: trailReviewSchema
  });

  context.trail_review = result;
  context.trails = result.trails || context.trails;

  if (result.pass !== true) {
    throw new Error(
      'Trail review failed\n' +
      JSON.stringify(result, null, 2)
    );
  }

  return context;
}
