import { callJson } from '../llm/client.js';
import { getCardsByType, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const SMOKE = process.env.SMOKE_MODE === 'true';
const EXPECTED_ACTS = [1, 2, 2, 3];
const CLUE_WEIGHTS = ['low', 'mid', 'high', 'mid'];

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['breadcrumbs', 'treasure_object'],
  properties: {
    breadcrumbs: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['card_title', 'card_contents', 'act'],
        properties: {
          card_title: { type: 'string' },
          card_contents: { type: 'string' },
          act: { type: 'integer', enum: [1, 2, 3] }
        }
      }
    },
    treasure_object: {
      type: 'object',
      additionalProperties: false,
      required: ['card_title', 'card_contents'],
      properties: {
        card_title: { type: 'string' },
        card_contents: { type: 'string' }
      }
    }
  }
};

function normalizeLoose(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function leaksHidingPlace(text, hidingPlace) {
  const h = normalizeLoose(hidingPlace);
  const t = normalizeLoose(text);
  return h.length >= 4 && t.includes(h);
}

function buildSmokePayload(locations, treasure, hidingPlace) {
  const locTitles = locations.map((l) => String(l?.card_title || '').trim()).filter(Boolean);
  const a = locTitles[0] || 'the main hall';
  const b = locTitles[1] || locTitles[0] || 'the east gallery';
  const c = locTitles[2] || locTitles[0] || 'the service passage';
  const obj = String(treasure?.object || 'the prize').trim();

  return {
    breadcrumbs: [
      {
        act: 1,
        card_title: 'Whispers about a hiding spot',
        card_contents: `Guests mention odd drafts and old storage habits near ${a}, nothing concrete yet.`
      },
      {
        act: 2,
        card_title: 'Physical tell',
        card_contents: `Scuff marks and disturbed dust patterns point toward routes connecting ${a} and ${b}.`
      },
      {
        act: 2,
        card_title: 'Structural detail',
        card_contents: `Paneling near ${b} sounds hollow; staff recall rarely opened compartments in that corner.`
      },
      {
        act: 3,
        card_title: 'Almost there',
        card_contents: `The trail tightens: combine the hollow panel clue with the quieter wing around ${c}; the cache sits in plain sight once you look with fresh eyes.`
      }
    ],
    treasure_object: {
      card_title: String(obj),
      card_contents: String(treasure?.treasure_solution || treasure?.significance || treasure?.concealment || `The ${obj}: the physical treasure everyone is hunting.`)
        .trim() || `The physical ${obj} everyone is hunting.`
    },
    hiding_place: hidingPlace
  };
}

function buildPrompt({ storyBlurb, treasure, locationTitles, hidingPlace }) {
  const locList = locationTitles.length
    ? locationTitles.map((t) => `- ${t}`).join('\n')
    : '- (none)';

  return {
    system: [
      'You write treasure-hunt breadcrumb clues for a murder mystery dinner party.',
      'The treasure hunt is parallel to the murder plot; no character is the secret owner of the hiding place.',
      'Breadcrumb clues must read like ordinary clue cards: in-world, concrete, playable.',
      'Never name the exact hiding place in any breadcrumb. Do not quote or paraphrase the hiding_place string.',
      'Reference only the listed location names when you need a place; do not invent new venue names.'
    ].join(' '),
    user: `
Story:
${storyBlurb}

Treasure (for your reference; do not reveal the hiding place in breadcrumbs):
- object: ${String(treasure?.object || '').trim()}
- treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

Exact hiding place (FORBIDDEN in breadcrumb card_contents — players learn it only from the finale card we add separately):
${String(hidingPlace || '').trim()}

Established locations (use only these names when naming places):
${locList}

Return JSON only.

breadcrumbs: exactly 4 clue-style cards with acts 1, 2, 2, 3 in that order.
- Act 1: one card, atmospheric and indirect about how valuables were handled or rumored, using at most light reference to one listed location.
- Act 2: two cards, more specific physical or spatial detail; combine to narrow toward the zone without naming the hiding place.
- Act 3: one card, a strong near-direct indicator (still do not name the hiding place outright).

treasure_object: one item card describing the treasure object itself (the thing being hunted), not where it is hidden.
Fields per breadcrumb: card_title, card_contents, act (integer 1–3).
Fields for treasure_object: card_title, card_contents.
`
  };
}

export async function treasureHuntAgent(context) {
  const treasure = context?.coreTruth?.treasure;
  const hidingPlace = String(treasure?.hiding_place || '').trim();
  if (!treasure || !hidingPlace) {
    throw new Error('treasure_hunt_agent requires coreTruth.treasure with hiding_place');
  }

  const locations = getCardsByType(context.cards, 'location');
  const locationTitles = locations.map((c) => String(c?.card_title || '').trim()).filter(Boolean);
  if (!locationTitles.length) {
    throw new Error('treasure_hunt_agent requires at least one location card in context.cards');
  }

  const storyBlurb = getStoryBlurb(context);
  let parsed;

  if (SMOKE) {
    parsed = buildSmokePayload(locations, treasure, hidingPlace);
  } else {
    parsed = await callJson({
      ...buildPrompt({ storyBlurb, treasure, locationTitles, hidingPlace }),
      schemaName: 'treasure_hunt',
      schema: responseSchema
    });
  }

  const hiding = hidingPlace;
  const rawCrumbs = Array.isArray(parsed?.breadcrumbs) ? parsed.breadcrumbs : [];
  if (rawCrumbs.length !== 4) {
    throw new Error('treasure_hunt_agent expected 4 breadcrumb clues');
  }

  const breadcrumbs = EXPECTED_ACTS.map((act, i) => ({
    act,
    card_title: rawCrumbs[i]?.card_title,
    card_contents: rawCrumbs[i]?.card_contents
  }));

  for (let i = 0; i < breadcrumbs.length; i += 1) {
    const b = breadcrumbs[i];
    const combined = `${b?.card_title || ''} ${b?.card_contents || ''}`;
    if (leaksHidingPlace(combined, hiding)) {
      throw new Error('treasure_hunt_agent: breadcrumb leaks hiding_place');
    }
  }

  const obj = parsed?.treasure_object || {};
  const clueEntries = breadcrumbs.map((b, i) => ({
    card_type: 'clue',
    card_title: String(b.card_title || '').trim(),
    card_contents: String(b.card_contents || '').trim(),
    act: EXPECTED_ACTS[i],
    clue_type: 'rumor',
    suspect_name: 'Guests',
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
    card_contents: hiding,
    act: 3,
    is_treasure: true,
    hidden_until_solved: true
  };

  pushCards(context, 'clue', clueEntries);
  pushCards(context, 'item', [treasureObjectEntry, treasureLocationEntry]);
  return context;
}
