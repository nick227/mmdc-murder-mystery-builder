// schemas/clueSchema.js

export const clueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents', 'act', 'trail_role'],
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    act: { type: 'integer', enum: [1, 2, 3] },
    trail_role: {
      type: 'string',
      enum: ['red_herring', 'ambiguous', 'killer_aligned']
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
