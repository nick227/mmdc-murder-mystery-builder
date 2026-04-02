
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
  required: ['game_card_type', 'card_title', 'card_contents', 'act'],
  properties: {
    game_card_type: {
      type: 'string',
      enum: ['performance', 'conversation', 'search', 'flavor', 'accusation', 'alibi', 'trade', 'revelation']
    },
    card_title: { type: 'string' },
    card_contents: { type: 'string' },
    act: { type: ['number','null'] }
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
