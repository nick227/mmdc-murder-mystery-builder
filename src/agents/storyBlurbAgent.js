import { callJson } from '../llm/client.js';
import { buildStoryBlurbPrompt } from '../prompts/storyBlurbPrompt.js';
import { storyBlurbSchema } from '../schemas/storyBlurbSchema.js';
import { appendUniqueCards } from '../utils/seedCards.js';

function toSeedCards(entities, cardType) {
  return (Array.isArray(entities) ? entities : []).map((entity) => ({
    card_type: cardType,
    card_title: String(entity?.name || '').trim(),
    card_contents: String(entity?.summary || '').trim(),
    act: 1
  }));
}

export async function storyBlurbAgent(context) {
  const prompt = buildStoryBlurbPrompt(context);

  const result = await callJson({
    ...prompt,
    schemaName: 'story_blurb',
    schema: storyBlurbSchema
  });

  context.storyBlurb = result.storyBlurb;
  context.storyEntities = {
    people: result.people || [],
    locations: result.locations || [],
    items: result.items || []
  };

  appendUniqueCards(context, [
    ...toSeedCards(result.people, 'person'),
    ...toSeedCards(result.locations, 'location'),
    ...toSeedCards(result.items, 'item')
  ]);

  console.log('Story blurb:', result.storyBlurb);

  return context;
}
