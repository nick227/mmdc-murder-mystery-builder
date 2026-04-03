import { callJson } from '../llm/client.js';
import { buildStoryBlurbPrompt } from '../prompts/storyBlurbPrompt.js';
import { storyBlurbSchema } from '../schemas/storyBlurbSchema.js';

export async function storyBlurbAgent(context) {
  const prompt = buildStoryBlurbPrompt(context);

  const result = await callJson({
    ...prompt,
    schemaName: 'story_blurb',
    schema: storyBlurbSchema
  });

  context.storyBlurb = String(result.storyBlurb || '').trim();
  context.storyEntities = { people: [], locations: [], items: [] };

  console.log('Story blurb:', context.storyBlurb);

  return context;
}
