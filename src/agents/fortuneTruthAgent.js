import { callText } from '../llm/client.js';
import { buildFortuneTruthPrompt } from '../prompts/fortuneTruthPrompt.js';
import { getStoryBlurb } from '../utils/context.js';

export async function fortuneTruthAgent(context) {
  const prompt = buildFortuneTruthPrompt({
    storyBlurb: getStoryBlurb(context),
    murderTruth: context.murder_truth,
    world: context.world
  });

  const text = await callText(prompt);

  context.fortune_truth = text;

  return context;
}
