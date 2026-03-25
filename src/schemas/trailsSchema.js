
export const trailsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['trails'],
  properties: {
    trails: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'goal', 'beats'],
        properties: {
          title: { type: 'string' },
          goal: { type: 'string' },
          beats: {
            type: 'array',
            minItems: 3,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['information', 'game'],
              properties: {
                information: { type: 'string' },
                game: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};
