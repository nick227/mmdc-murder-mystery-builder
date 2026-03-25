
import { callJson } from '../llm/client.js';
import { buildCluesPrompt } from '../prompts/cluesPrompt.js';
import { cluesArraySchema } from '../schemas/clueSchema.js';
import { pushCards } from '../utils/cards.js';

export async function clueAgent(context) {

  const prompt = buildCluesPrompt({
    storyBlurb: context.story_blurb,
    trails: context.trails,
    narratives: context.narratives,
    characters: context.characters
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'clue_cards',
    schema: cluesArraySchema(8, 16)
  });

  const clues = result.cards || [];

  const cards = clues.map(c => ({
    card_type: 'clue',
    card_title: c.card_title,
    card_contents: c.card_contents
  }));

  return pushCards(context, 'clue', cards);
}
