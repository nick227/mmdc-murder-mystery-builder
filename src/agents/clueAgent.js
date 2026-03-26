import { callJson } from '../llm/client.js';
import { buildCluesPrompt } from '../prompts/cluesPrompt.js';
import { cluesArraySchema } from '../schemas/clueSchema.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const trailRoleToAct = {
  red_herring: 1,
  ambiguous: 2,
  killer_aligned: 3
};

export async function clueAgent(context) {
  const prompt = buildCluesPrompt({
    storyBlurb: getStoryBlurb(context),
    trails: context.trails,
    narratives: context.narratives,
    characters: getCharacterCards(context.cards)
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'clue_cards',
    schema: cluesArraySchema(8, 16)
  });

  const clues = result.cards || [];

  const cards = clues.map((c) => ({
    card_type: 'clue',
    card_title: c.card_title,
    card_contents: c.card_contents,
    trail_role: c.trail_role,
    act: trailRoleToAct[c.trail_role] || c.act
  }));

  return pushCards(context, 'clue', cards);
}
