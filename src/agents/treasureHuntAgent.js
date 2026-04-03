import { callJson } from '../llm/client.js';
import { pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { treasureHuntResponseSchema } from '../schemas/treasureHuntSchema.js';

const BREADCRUMB_ACTS = [1, 2, 2, 3];
const CLUE_WEIGHTS = ['low', 'mid', 'high', 'mid'];

function normalizeLoose(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textLeaksHidingPlace(text, hidingPlace) {
  const h = normalizeLoose(hidingPlace);
  const t = normalizeLoose(text);
  return h.length >= 4 && t.includes(h);
}

function buildPrompt({ storyBlurb, treasure }) {
  return {
    system: [
      'Write four short in-world clue cards for a parallel treasure hunt (same story).',
      'Concrete, playable; spread the trail across the four — no single card solves the whole hunt.',
      'Return JSON only.'
    ].join(' '),
    user: `Story:
${storyBlurb}

Treasure:
object: ${String(treasure?.object || '').trim()}
treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

Return JSON: breadcrumbs — four { card_title, card_contents } in play order; treasure_object — { card_title, card_contents } describing the physical thing sought (not a walkthrough of the finale).`
  };
}

export async function treasureHuntAgent(context) {
  const treasure = context?.coreTruth?.treasure;
  const hidingPlace = String(treasure?.hiding_place || '').trim();
  if (!treasure || !hidingPlace) {
    throw new Error('treasure_hunt_agent requires coreTruth.treasure with hiding_place');
  }

  const storyBlurb = getStoryBlurb(context);
  const parsed = await callJson({
    ...buildPrompt({ storyBlurb, treasure }),
    schemaName: 'treasure_hunt',
    schema: treasureHuntResponseSchema
  });

  const crumbs = Array.isArray(parsed?.breadcrumbs) ? parsed.breadcrumbs : [];
  if (crumbs.length !== 4) {
    throw new Error('treasure_hunt_agent expected 4 breadcrumb clues');
  }

  for (const c of crumbs) {
    const combined = `${c?.card_title || ''} ${c?.card_contents || ''}`;
    if (textLeaksHidingPlace(combined, hidingPlace)) {
      throw new Error('treasure_hunt_agent: breadcrumb leaks hiding_place');
    }
  }

  const obj = parsed?.treasure_object || {};
  const clueEntries = crumbs.map((b, i) => ({
    card_type: 'clue',
    card_title: String(b.card_title || '').trim(),
    card_contents: String(b.card_contents || '').trim(),
    act: BREADCRUMB_ACTS[i],
    clue_type: 'treasure',
    clue_weight: CLUE_WEIGHTS[i]
  }));

  const treasureObjectEntry = {
    card_type: 'item',
    card_title: String(obj.card_title || treasure.object || 'Treasure').trim(),
    card_contents: String(obj.card_contents || '').trim(),
    act: 3,
    is_treasure: true,
    hidden_until_solved: true
  };

  const treasureLocationEntry = {
    card_type: 'item',
    card_title: 'Treasure hiding place',
    card_contents: hidingPlace,
    act: 3,
    is_treasure: true,
    hidden_until_solved: true
  };

  pushCards(context, 'clue', clueEntries);
  pushCards(context, 'item', [treasureObjectEntry, treasureLocationEntry]);
  return context;
}
