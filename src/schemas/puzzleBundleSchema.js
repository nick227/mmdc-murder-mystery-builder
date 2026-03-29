const puzzleBundleCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'card_type',
    'card_title',
    'card_contents'
  ],
  properties: {
    card_type: { type: 'string', enum: ['puzzle', 'evidence', 'solution'] },
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

export const puzzleBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 4,
      maxItems: 7,
      items: puzzleBundleCardSchema
    }
  }
};
