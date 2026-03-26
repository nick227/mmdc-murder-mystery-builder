import { callText } from '../llm/client.js';
import { buildStoryBlurbPrompt } from '../prompts/storyBlurbPrompt.js';

export async function storyBlurbAgent(context) {
  const prompt = buildStoryBlurbPrompt(context);

  const text = await callText(prompt);

  context.storyBlurb = text;
  context.story_blurb = text;

  console.log('Story blurb:', text);

  return context;
}
