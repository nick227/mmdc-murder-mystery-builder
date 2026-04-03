import { callJson } from '../llm/client.js';
import { getCardsByType, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { treasureHuntResponseSchema } from '../schemas/treasureHuntSchema.js';

const SMOKE = process.env.SMOKE_MODE === 'true';
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

function smokeBreadcrumbs(locations, treasure) {
  const titles = locations.map((l) => String(l?.card_title || '').trim()).filter(Boolean);
  const a = titles[0] || 'the main hall';
  const b = titles[1] || titles[0] || 'the east gallery';
  const c = titles[2] || titles[0] || 'the service passage';
  const obj = String(treasure?.object || 'the prize').trim();
  const objBody = String(treasure?.treasure_solution || `The ${obj}: the physical treasure everyone is hunting.`).trim();

  return {
    breadcrumbs: [
      {
        card_title: 'Whispers about a hiding spot',
        card_contents: `Guests mention odd drafts and old storage habits near ${a}, nothing concrete yet.`
      },
      {
        card_title: 'Physical tell',
        card_contents: `Scuff marks and disturbed dust patterns point toward routes connecting ${a} and ${b}.`
      },
      {
        card_title: 'Structural detail',
        card_contents: `Paneling near ${b} sounds hollow; staff recall rarely opened compartments in that corner.`
      },
      {
        card_title: 'Almost there',
        card_contents: `The trail tightens: combine the hollow panel clue with the quieter wing around ${c}; the cache sits in plain sight once you look with fresh eyes.`
      }
    ],
    treasure_object: {
      card_title: obj,
      card_contents: objBody
    }
  };
}

function buildPrompt({ storyBlurb, treasure, locationTitles, hidingPlace }) {
  const locList = locationTitles.length
    ? locationTitles.map((t) => `- ${t}`).join('\n')
    : '- (none)';

  return {
    system: [
      'Treasure-hunt breadcrumbs for a murder-mystery party (parallel to the murder).',
      'Four clue-style cards in order: act 1, then 2, then 2, then 3 — you only supply title and text; acts are fixed downstream.',
      'In-world, concrete; never name or quote the exact hiding place below.',
      'Use only the listed location names for places.'
    ].join(' '),
    user: `Story:
${storyBlurb}

Treasure (do not expose hiding_place in breadcrumbs):
object: ${String(treasure?.object || '').trim()}
treasure_solution: ${String(treasure?.treasure_solution || '').trim()}

hiding_place (FORBIDDEN in breadcrumb text — revealed on a separate card later):
${String(hidingPlace || '').trim()}

Locations (only these names for places):
${locList}

Return JSON: breadcrumbs (array of 4 { card_title, card_contents } in play order), treasure_object { card_title, card_contents } describing the hunted object, not where it is hidden.`
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
  const parsed = SMOKE
    ? smokeBreadcrumbs(locations, treasure)
    : await callJson({
      ...buildPrompt({ storyBlurb, treasure, locationTitles, hidingPlace }),
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
    card_contents: hidingPlace,
    act: 3,
    is_treasure: true,
    hidden_until_solved: true
  };

  pushCards(context, 'clue', clueEntries);
  pushCards(context, 'item', [treasureObjectEntry, treasureLocationEntry]);
  return context;
}
