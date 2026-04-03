const clueEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents'],
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

const itemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents'],
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

/** One clue per playable character; `linked_character` assigned in code. */
export function buildTreasureHuntResponseSchema(clueCount) {
  const n = Number(clueCount);
  if (!Number.isInteger(n) || n < 1 || n > 32) {
    throw new Error('treasure_hunt_schema: clueCount must be 1–32');
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['clues', 'item'],
    properties: {
      clues: {
        type: 'array',
        minItems: n,
        maxItems: n,
        items: clueEntrySchema
      },
      item: itemSchema
    }
  };
}
