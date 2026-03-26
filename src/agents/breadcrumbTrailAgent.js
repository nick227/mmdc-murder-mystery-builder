import { callJson } from '../llm/client.js';
import { buildBreadcrumbTrailPrompt } from '../prompts/breadcrumbTrailPrompt.js';
import { trailsSchema } from '../schemas/trailsSchema.js';

export async function breadcrumbTrailAgent(context) {
  const prompt = buildBreadcrumbTrailPrompt({
    murder_truth: context.murder_truth,
    fortune_truth: context.fortune_truth,
    world: context.world,
    solution: context.solution
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'breadcrumb_trails',
    schema: trailsSchema
  });

  context.trails = result.trails || result.steps || [];
  return context;
}
