const clueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents', 'target_name', 'weight'],
  description: 'A minimal clue card payload for prose generation with oversight fields.',
  properties: {
    card_title: { type: 'string' },
    card_contents: {
      type: 'string',
      description: 'Under 40 words; in-world only, no internal labels.'
    },
    target_name: { type: ['string', 'null'] },
    weight: { type: 'string', enum: ['low', 'mid', 'high'] }
  }
};

export function cluesArraySchema(minItems = 1, maxItems = 12) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems,
        maxItems,
        items: clueSchema
      }
    }
  };
}
