const clueProseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_contents'],
  properties: {
    card_contents: { type: 'string' }
  }
};

export function clueProseArraySchema(minItems = 1, maxItems = 12) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems,
        maxItems,
        items: clueProseSchema
      }
    }
  };
}
