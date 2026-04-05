import { callJson } from '../llm/client.js';
import { getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb, getStoryMetaForPrompts } from '../utils/context.js';
import { buildTreasureHuntResponseSchema } from '../schemas/treasureHuntSchema.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveSuspectIdForCharacter(context, characterCard) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  const characterId = String(characterCard?.card_id || '').trim();
  const direct = suspects.find((s) => String(s?.card_id || '').trim() === characterId);
  if (direct?.suspect_id) {
    return String(direct.suspect_id).trim();
  }

  const name = String(characterCard?.card_title || '').split(',')[0].trim();
  const normalized = normalizeText(name);
  const byName = suspects.find((s) =>
    normalizeText(s?.name) === normalized
    || normalizeText(s?.title) === normalized
  );
  return byName?.suspect_id ? String(byName.suspect_id).trim() : null;
}

function buildPrompt({ storyBlurb, storyMeta, treasure, clueCount }) {
  return {
    system: 'Generate treasure hunt clues. Return JSON only.',
    user: `Generate treasure hunt clues.

Rules:
- Generate EXACTLY ${clueCount} treasure clues.
- All card_title must be unique.
- Clues should collectively hint at the treasure_solution.
- No single clue should reveal it.
- Match tone and motifs from the packaging block.
- Return JSON only.

Treasure (canonical — already defined upstream):
object: ${String(treasure?.object || '').trim()}
treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

Story concept:
${storyBlurb}

Packaging and thematic guidance:
${storyMeta || '(none)'}

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
      storyMeta: getStoryMetaForPrompts(context),
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
    const suspectId = resolveSuspectIdForCharacter(context, ch);

    return {
      card_type: 'clue',
      card_title: String(c.card_title || '').trim(),
      card_contents: String(c.card_contents || '').trim(),
      role: 'treasure',
      target_id: suspectId,
      weight: 'low'
    };
  });

  pushCards(context, 'clue', clueEntries);
  return context;
}

