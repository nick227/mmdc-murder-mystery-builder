const clueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents', 'clue_type', 'suspect_name', 'clue_weight'],
  description: 'A clue card: one small information unit (artifact, fact, or derived).',
  properties: {
    card_title: { type: 'string' },
    card_contents: {
      type: 'string',
      description: 'Under 100 words; in-world only, no internal labels (Canonical victim, etc.).'
    },
    clue_type: {
      type: 'string',
      enum: ['artifact', 'fact', 'derived'],
      description: 'artifact | fact | derived — mix across the deck.'
    },
    suspect_name: {
      type: 'string',
      description: 'Person most directly connected to the clue (not necessarily the killer).'
    },
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
