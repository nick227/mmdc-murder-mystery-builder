import { getCardsByType, pushCards } from '../utils/cards.js';

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exactly one item card is flagged `is_treasure` to match the canonical treasure object. */
export async function treasureItemAgent(context) {
  const treasure = context?.coreTruth?.treasure;
  const object = String(treasure?.object || '').trim();
  if (!object) {
    throw new Error('treasure_item_agent requires coreTruth.treasure.object');
  }

  const items = getCardsByType(context.cards || [], 'item');
  for (const card of items) {
    delete card.is_treasure;
  }

  const targetNorm = normalizeTitle(object);
  const target = items.find((c) => normalizeTitle(c.card_title) === targetNorm);
  if (target) {
    target.is_treasure = true;
    return context;
  }

  const hiding = String(treasure?.hiding_place || '').trim();
  const solution = String(treasure?.treasure_solution || '').trim();
  const lines = [`The object everyone is hunting: ${object}.`];
  if (hiding) {
    lines.push(`Where it is hidden (canonical): ${hiding}`);
  }
  if (solution) {
    lines.push(`Resolution: ${solution}`);
  }

  return pushCards(context, 'item', [
    {
      card_title: object,
      card_contents: lines.join('\n\n'),
      is_treasure: true,
      act: 1
    }
  ]);
}
