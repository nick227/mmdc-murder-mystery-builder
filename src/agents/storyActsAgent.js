import { callJson } from '../llm/client.js';
import { buildStoryActsPrompt } from '../prompts/storyActsPrompt.js';
import { storyActsCardsSchema } from '../schemas/simpleCardsSchema.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

export async function storyActsAgent(context) {
  const prompt = buildStoryActsPrompt({
    storyBlurb: getStoryBlurb(context),
    narratives: context.narratives,
    characters: getCharacterCards(context.cards),
    locations: getCardsByType(context.cards, 'location')
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'story_acts',
    schema: storyActsCardsSchema
  });

  const raw = result.cards || [];
  if (raw.length !== 3) {
    throw new Error(`story_acts_agent: expected exactly 3 story act cards, got ${raw.length}`);
  }

  const cards = raw.map((c, i) => {
    const body = String(c?.card_contents || '').trim();
    if (body.length < 40) {
      throw new Error(`story_acts_agent: act ${i + 1} card_contents too short`);
    }

    return {
      card_title: String(c?.card_title || '').trim(),
      card_contents: body,
      act: i + 1
    };
  });

  return pushCards(context, 'story_act', cards);
}
