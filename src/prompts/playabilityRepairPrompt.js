import { getSolution } from '../utils/context.js';

export function buildPlayabilityRepairPrompt(context, report) {
  const characters = (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'character')
    .map((card) => card.card_title);
  const locations = (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'location')
    .map((card) => card.card_title);

  return {
    system: [
      'You repair a murder mystery card set for playability.',
      'Fix contradictions, unsupported named entities, encoding glitches, and timeline drift.',
      'Do not add cards, remove cards, or reorder cards.',
      'Preserve hidden structure, puzzle metadata, and the core solution.',
      'Keep names constrained to the provided playable characters and provided locations unless a card already clearly establishes a public NPC.',
      'Return JSON only.'
    ].join(' '),
    user: `
Playability report:
${JSON.stringify(report || {}, null, 2)}

Canonical solution:
${JSON.stringify(getSolution(context) || {}, null, 2)}

Playable characters:
${JSON.stringify(characters, null, 2)}

Allowed locations:
${JSON.stringify(locations, null, 2)}

Cards:
${JSON.stringify(context.cards || [], null, 2)}

Return:
{
  "cards": [
    {
      "card_title": "",
      "card_contents": "",
      "act": 1
    }
  ]
}
`.trim()
  };
}
