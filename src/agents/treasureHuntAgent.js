import { callJson } from '../llm/client.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { buildTreasureHuntResponseSchema } from '../schemas/treasureHuntSchema.js';

function buildPrompt({ storyBlurb, treasure, clueCount }) {
  return {
    system: 'Generate treasure hunt clues. Return JSON only.',
    user: `Generate treasure hunt clues.

Rules:
- Generate EXACTLY ${clueCount} treasure clues.
- Clues should collectively hint at the treasure_solution.
- No single clue should reveal it.
- Return JSON only.

Treasure (canonical — already defined upstream):
object: ${String(treasure?.object || '').trim()}
treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

Story:
${storyBlurb}

Clue count: ${clueCount}

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

  const characters = getCharacterCards(context.cards);
  if (!characters.length) {
    throw new Error('treasure_hunt_agent requires at least one character card');
  }

  const n = characters.length;

  const storyBlurb = getStoryBlurb(context);
  const schema = buildTreasureHuntResponseSchema(n);
  const parsed = await callJson({
    ...buildPrompt({
      storyBlurb,
      treasure,
      clueCount: n
    }),
    schemaName: 'treasure_hunt',
    schema
  });

  const raw = Array.isArray(parsed?.clues) ? parsed.clues : [];
  if (raw.length !== n) {
    throw new Error(`treasure_hunt_agent expected ${n} clues`);
  }

  const clueEntries = raw.map((c, i) => {
    const ch = characters[i];
    const title = String(ch?.card_title || '').trim();

    return {
      card_type: 'clue',
      card_title: String(c.card_title || '').trim(),
      card_contents: String(c.card_contents || '').trim(),
      clue_type: 'treasure',
      linked_character: title
    };
  });

  pushCards(context, 'clue', clueEntries);
  return context;
}
