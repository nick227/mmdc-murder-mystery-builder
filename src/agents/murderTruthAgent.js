import { callText } from '../llm/client.js';
import { buildMurderTruthPrompt } from '../prompts/murderTruthPrompt.js';
import { getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function murderTruthAgent(context) {
  const prompt = buildMurderTruthPrompt({
    storyBlurb: getStoryBlurb(context),
    characters: getCharacterCards(context.cards),
    world: context.world
  });

  const text = await callText(prompt);

  context.murder_truth = text;

  return context;
}
