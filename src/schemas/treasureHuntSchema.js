/** LLM output for treasure hunt: four breadcrumbs (acts assigned in code) + one item card for the object. */
export const treasureHuntResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['breadcrumbs', 'treasure_object'],
  properties: {
    breadcrumbs: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['card_title', 'card_contents'],
        properties: {
          card_title: { type: 'string' },
          card_contents: { type: 'string' }
        }
      }
    },
    treasure_object: {
      type: 'object',
      additionalProperties: false,
      required: ['card_title', 'card_contents'],
      properties: {
        card_title: { type: 'string' },
        card_contents: { type: 'string' }
      }
    }
  }
};
