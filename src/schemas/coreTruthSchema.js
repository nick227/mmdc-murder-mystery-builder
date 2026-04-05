export const coreTruthSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['murder', 'treasure'],
  properties: {
    murder: {
      type: 'object',
      additionalProperties: false,
      required: ['killer', 'victim', 'location', 'method', 'motive', 'opportunity', 'window', 'window_start', 'window_end', 'murder_solution'],
      properties: {
        killer: { type: 'string' },
        victim: { type: 'string' },
        location: { type: 'string' },
        method: { type: ['string', 'null'] },
        motive: { type: ['string', 'null'] },
        opportunity: { type: ['string', 'null'] },
        window: { type: ['string', 'null'] },
        window_start: { type: ['string', 'null'] },
        window_end: { type: ['string', 'null'] },
        murder_solution: { type: 'string' }
      }
    },
    treasure: {
      type: 'object',
      additionalProperties: false,
      required: ['object', 'hiding_place', 'treasure_solution'],
      properties: {
        object: { type: 'string' },
        hiding_place: { type: 'string' },
        treasure_solution: { type: 'string' }
      }
    }
  }
};
