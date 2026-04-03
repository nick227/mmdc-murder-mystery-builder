import { callJson } from '../llm/client.js';
import { pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { treasureHuntResponseSchema } from '../schemas/treasureHuntSchema.js';

const TIDBIT_ACTS = [1, 2, 2, 3];
const CLUE_WEIGHTS = ['low', 'mid', 'high', 'mid'];

function buildPrompt({ storyBlurb, treasure }) {
  return {
    system: [
      'Four short in-world tidbits plus one item card for a parallel treasure thread (same story).',
      'Concrete and playable. Return JSON only.'
    ].join(' '),
    user: `Story:
${storyBlurb}

Treasure:
object: ${String(treasure?.object || '').trim()}
treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

Return JSON only.`
  };
}

export async function treasureHuntAgent(context) {
  const treasure = context?.coreTruth?.treasure;
  const object = String(treasure?.object || '').trim();
  const solution = String(treasure?.treasure_solution || '').trim();
  if (!treasure || !object || !solution) {
    throw new Error('treasure_hunt_agent requires coreTruth.treasure with object and treasure_solution');
  }

  const storyBlurb = getStoryBlurb(context);
  const parsed = await callJson({
    ...buildPrompt({ storyBlurb, treasure }),
    schemaName: 'treasure_hunt',
    schema: treasureHuntResponseSchema
  });

  const tidbits = Array.isArray(parsed?.tidbits) ? parsed.tidbits : [];
  if (tidbits.length !== 4) {
    throw new Error('treasure_hunt_agent expected 4 tidbit clues');
  }

  const obj = parsed?.treasure_object || {};
  const clueEntries = tidbits.map((b, i) => ({
    card_type: 'clue',
    card_title: String(b.card_title || '').trim(),
    card_contents: String(b.card_contents || '').trim(),
    act: TIDBIT_ACTS[i],
    clue_type: 'treasure',
    clue_weight: CLUE_WEIGHTS[i]
  }));

  const body = String(obj.card_contents || '').trim() || solution;

  const treasureItem = {
    card_type: 'item',
    card_title: String(obj.card_title || object || 'Treasure').trim(),
    card_contents: body,
    act: 3,
    is_treasure: true,
    hidden_until_solved: true
  };

  pushCards(context, 'clue', clueEntries);
  pushCards(context, 'item', [treasureItem]);
  return context;
}
