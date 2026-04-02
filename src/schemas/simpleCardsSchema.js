// Unacted schema — for character profiles only (always act 1, no field needed)
export const simpleCardsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['card_title', 'card_contents'],
        properties: {
          card_title: { type: 'string' },
          card_contents: { type: 'string' }
        }
      }
    }
  }
};

// Acted schema — for host speeches and story acts (act is always known at generation time)
export const actedSimpleCardsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['card_title', 'card_contents', 'act', 'location_ref'],
        properties: {
          card_title: { type: 'string' },
          card_contents: { type: 'string' },
          act: { type: 'integer', enum: [1, 2, 3] },
          location_ref: { type: ['string', 'null'] }
        }
      }
    }
  }
};
