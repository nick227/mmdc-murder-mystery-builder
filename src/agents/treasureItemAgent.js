import { getCardsByType, pushCards } from '../utils/cards.js';

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Host adapter contract: one `card_type: "treasure"` for finale reveal (not `item` + is_treasure).
 * Optional `linked_item_id` points at the matching prop item card when present.
 */
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

  context.cards = (context.cards || []).filter((c) => c?.card_type !== 'treasure');
  context.cards = (context.cards || []).filter((c) => !(c?.card_type === 'clue' && c?.meta?.treasure_stage === 'clue'));

  const targetNorm = normalizeTitle(object);
  const targetItem = items.find((c) => normalizeTitle(c.card_title) === targetNorm);

  const hiding = String(treasure?.hiding_place || '').trim();
  const solution = String(treasure?.treasure_solution || '').trim();
  const clueLines = [
    `${object} is the inheritance object at the center of the treasure trail.`
  ];
  if (solution) {
    clueLines.push(solution.split(/[.!?]/)[0]?.trim() || solution);
  }
  const clueBody = clueLines.filter(Boolean).join(' ');

  const lines = [
    'Host reveal: read when the group recovers the treasure or at the end of Act 3.',
    '',
    `Treasure: ${object}`
  ];
  if (hiding) {
    lines.push(`Where it was hidden: ${hiding}`);
  }
  if (solution) {
    lines.push(`Resolution: ${solution}`);
  }

  const body = lines.join('\n');
  if (body.trim().length < 40) {
    throw new Error('treasure_item_agent: treasure reveal text too short');
  }

  pushCards(context, 'clue', [
    {
      card_title: `${object} Lead`,
      card_contents: clueBody,
      act: 3,
      hidden_until_solved: true,
      role: 'treasure',
      target_id: targetItem?.card_id || null,
      weight: 'high',
      linked_item_id: targetItem?.card_id,
      meta: { treasure_stage: 'clue' }
    }
  ]);

  return pushCards(context, 'treasure', [
    {
      card_title: object,
      card_contents: body,
      act: 3,
      hidden_until_solved: true,
      linked_item_id: targetItem?.card_id,
      meta: { treasure_stage: 'reveal' }
    }
  ]);
}
