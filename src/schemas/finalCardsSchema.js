const finalCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'card_id',
    'card_type',
    'card_title',
    'card_contents',
    'act',
    'linked_character_id',
    'linked_character_index',
    'linked_character',
    'trail_role',
    'bundle_id',
    'puzzle_type',
    'difficulty',
    'required_card_ids',
    'unlock_card_ids',
    'actionable_gain',
    'solution_summary',
    'hidden_until_solved',
    'evidence_strength',
    'requires'
  ],
  properties: {
    card_id: { type: 'string' },
    card_type: { type: 'string' },
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    act: { type: 'integer', enum: [1, 2, 3] },
    linked_character_id: { type: ['string', 'null'] },
    linked_character_index: { type: ['integer', 'null'] },
    linked_character: { type: ['string', 'null'] },
    trail_role: { type: ['string', 'null'], enum: ['red_herring', 'ambiguous', 'killer_aligned', null] },
    bundle_id: { type: ['string', 'null'] },
    puzzle_type: { type: ['string', 'null'], enum: ['cross_reference', 'cipher', 'item_combination', 'timeline', 'elimination', null] },
    difficulty: { type: ['string', 'null'], enum: ['easy', 'medium', 'hard', null] },
    required_card_ids: {
      type: ['array', 'null'],
      items: { type: 'string' }
    },
    unlock_card_ids: {
      type: ['array', 'null'],
      items: { type: 'string' }
    },
    actionable_gain: { type: ['string', 'null'] },
    solution_summary: { type: ['string', 'null'] },
    hidden_until_solved: { type: ['boolean', 'null'] },
    evidence_strength: { type: ['string', 'null'], enum: ['weak', 'supporting', 'strong', 'decisive', null] },
    requires: {
      type: ['array', 'null'],
      items: { type: 'string' }
    }
  }
};

export const finalCardsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: finalCardSchema
    }
  }
};
