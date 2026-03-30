const clueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents', 'clue_type', 'suspect_name', 'clue_weight'],
  description: 'A clue card providing an observable fact about the mystery.',
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    clue_type: { type: 'string' },
    suspect_name: { type: 'string', description: 'The primary suspect this clue relates to.' },
    clue_weight: {
      type: 'string',
      enum: ['low', 'mid', 'high'],
      description: 'Evidential strength. Distribute evenly: low, mid, high.'
    }
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