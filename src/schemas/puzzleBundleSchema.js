const puzzleBundleCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'card_ref',
    'card_type',
    'card_title',
    'card_contents',
    'act',
    'hidden_until_solved'
  ],
  properties: {
    card_ref: { type: 'string' },
    card_type: { type: 'string', enum: ['puzzle', 'item', 'clue'] },
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    act: { type: 'integer', enum: [1, 2, 3] },
    hidden_until_solved: { type: 'boolean' }
  }
};

const puzzleBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'puzzle_type',
    'difficulty',
    'actionable_gain',
    'solution_summary',
    'required_card_refs',
    'unlock_card_refs',
    'cards'
  ],
  properties: {
    puzzle_type: {
      type: 'string',
      enum: ['cross_reference', 'cipher', 'item_combination', 'timeline', 'elimination']
    },
    difficulty: {
      type: 'string',
      enum: ['easy', 'medium', 'hard']
    },
    actionable_gain: { type: 'string' },
    solution_summary: { type: 'string' },
    required_card_refs: {
      type: 'array',
      minItems: 2,
      items: { type: 'string' }
    },
    unlock_card_refs: {
      type: 'array',
      minItems: 0,
      items: { type: 'string' }
    },
    cards: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: puzzleBundleCardSchema
    }
  }
};

export function puzzleBundlesSchema(minItems = 3, maxItems = 4) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['bundles'],
    properties: {
      bundles: {
        type: 'array',
        minItems,
        maxItems,
        items: puzzleBundleSchema
      }
    }
  };
}
