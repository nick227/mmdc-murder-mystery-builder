import { callJson } from '../llm/client.js';
import { solutionSchema } from '../schemas/solutionSchema.js';
import { buildSolutionPrompt } from '../prompts/solutionPrompt.js';

export async function solutionAssemblerAgent(context) {

  const prompt = buildSolutionPrompt({
    storyBlurb: context.story_blurb,
    murder: context.murder_truth,
    fortune: context.fortune_truth,
    world: context.world
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'solution',
    schema: solutionSchema
  });

  context.solutions = result;

  return context;
}
