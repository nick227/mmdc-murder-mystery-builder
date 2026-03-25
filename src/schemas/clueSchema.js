// schemas/clueSchema.js

export const clueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents'],
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
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
