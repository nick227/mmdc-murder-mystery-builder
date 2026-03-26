export const solutionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'killer',
    'method',
    'location',
    'motive'
  ],
  properties: {
    killer: { type: 'string' },
    method: { type: 'string' },
    location: { type: 'string' },
    motive: { type: 'string' }
  }
};
