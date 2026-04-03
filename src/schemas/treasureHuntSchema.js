/** LLM output: four small tidbit clues + one item card for the treasure thread. */
export const treasureHuntResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tidbits', 'treasure_object'],
  properties: {
    tidbits: {
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
