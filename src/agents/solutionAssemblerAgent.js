import { callJson } from '../llm/client.js';
import { solutionSchema } from '../schemas/solutionSchema.js';
import { buildSolutionPrompt } from '../prompts/solutionPrompt.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function solutionAssemblerAgent(context) {
  const prompt = buildSolutionPrompt({
    storyBlurb: getStoryBlurb(context),
    murder: context.murder_truth,
    fortune: context.fortune_truth,
    world: context.world,
    characters: getCharacterCards(context.cards)
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'solution',
    schema: solutionSchema
  });

  context.solution = result;
  context.solutions = result;

  return context;
}
