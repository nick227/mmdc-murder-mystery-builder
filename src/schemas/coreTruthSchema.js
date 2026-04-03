export const coreTruthSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['murder', 'treasure'],
  properties: {
    murder: {
      type: 'object',
      additionalProperties: false,
      required: ['killer', 'victim', 'location', 'murder_solution'],
      properties: {
        killer: { type: 'string' },
        victim: { type: 'string' },
        location: { type: 'string' },
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
