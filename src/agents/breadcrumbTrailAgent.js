import { callJson } from '../llm/client.js';
import { buildBreadcrumbTrailPrompt } from '../prompts/breadcrumbTrailPrompt.js';
import { trailsSchema } from '../schemas/trailsSchema.js';
import { getCardsByType } from '../utils/cards.js';
import { getMurderTruth, getSolution, getTreasureTruth } from '../utils/context.js';

export async function breadcrumbTrailAgent(context) {
  const prompt = buildBreadcrumbTrailPrompt({
    murder_truth: getMurderTruth(context),
    fortune_truth: getTreasureTruth(context),
    world: context.world,
    solution: getSolution(context),
    locations: getCardsByType(context.cards, 'location')
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'breadcrumb_trails',
    schema: trailsSchema
  });

  context.trails = result.trails || result.steps || [];
  return context;
}
