import { callJson } from '../llm/client.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { buildTreasureHuntResponseSchema } from '../schemas/treasureHuntSchema.js';

const WEIGHT_CYCLE = ['low', 'mid', 'mid', 'high'];

function buildPrompt({ storyBlurb, treasure, characterTitles, clueCount }) {
  const list = characterTitles.map((t) => `- ${t}`).join('\n');
  return {
    system: 'Generate treasure hunt clues. Return JSON only.',
    user: `Generate treasure hunt clues.

Rules:
- EXACTLY ${clueCount} clues — one per character, same order as listed.
- Use ONLY these characters (by name; do not invent others):
${list}

- Each clue is a short concrete statement hinting toward the treasure thread.
- Ground hints in treasure_solution; do not reveal the full solution in one line.
- Do not output linked_character fields; order matches the list above.

Treasure:
object: ${String(treasure?.object || '').trim()}
treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

Story:
${storyBlurb}

Also generate one final treasure item description (the physical thing and why it matters — not a spoiler dump).

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
  const characterTitles = characters.map((c) => String(c.card_title || '').trim()).filter(Boolean);
  if (characterTitles.length !== n) {
    throw new Error('treasure_hunt_agent: character cards need card_title');
  }

  const storyBlurb = getStoryBlurb(context);
  const schema = buildTreasureHuntResponseSchema(n);
  const parsed = await callJson({
    ...buildPrompt({
      storyBlurb,
      treasure,
      characterTitles,
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
      act: 1,
      clue_type: 'treasure',
      clue_weight: WEIGHT_CYCLE[i % WEIGHT_CYCLE.length],
      linked_character: title
    };
  });

  const it = parsed?.item || {};
  const body = String(it.card_contents || '').trim() || solution;

  const treasureItem = {
    card_type: 'item',
    card_title: String(it.card_title || object || 'Treasure').trim(),
    card_contents: body,
    act: 1,
    is_treasure: true,
    hidden_until_solved: true
  };

  pushCards(context, 'clue', clueEntries);
  pushCards(context, 'item', [treasureItem]);
  return context;
}
