const evidenceCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_type', 'card_title', 'card_contents'],
  properties: {
    card_type: { type: 'string', enum: ['evidence'] },
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

const gateCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_type', 'card_title', 'card_contents'],
  properties: {
    card_type: { type: 'string', enum: ['gate'] },
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

const solutionCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_type', 'card_title', 'card_contents'],
  properties: {
    card_type: { type: 'string', enum: ['solution'] },
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

const puzzleCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_type', 'card_title', 'card_contents', 'unlocked_item'],
  properties: {
    card_type: { type: 'string', enum: ['puzzle'] },
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    unlocked_item: { type: 'string' }
  }
};

const puzzleBundleCardSchema = {
  anyOf: [puzzleCardSchema, evidenceCardSchema, gateCardSchema, solutionCardSchema]
};

export const puzzleBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      items: puzzleBundleCardSchema
    }
  }
};
