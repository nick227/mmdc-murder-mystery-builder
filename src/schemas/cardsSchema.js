
export const cardSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents'],
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    location_ref: { type: ['string', 'null'] }
  }
};

export const actedCardSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['card_title', 'card_contents'],
  properties: {
    card_title: { type: 'string' },
    card_contents: { type: 'string' }
  }
};

export function cardsArraySchema(minItems = 1, maxItems = 12) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems,
        maxItems,
        items: cardSchema
      }
    }
  };
}

export function actedCardsArraySchema(minItems = 1, maxItems = 12) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['cards'],
    properties: {
      cards: {
        type: 'array',
        minItems,
        maxItems,
        items: actedCardSchema
      }
    }
  };
}
