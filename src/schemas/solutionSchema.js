export const solutionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'killer',
    'murder_location',
    'murder_method',
    'fortune_object',
    'fortune_location',
    'misleading_assumption'
  ],
  properties: {
    killer: { type: 'string' },
    murder_location: { type: 'string' },
    murder_method: { type: 'string' },
    fortune_object: { type: 'string' },
    fortune_location: { type: 'string' },
    misleading_assumption: { type: 'string' }
  }
};
