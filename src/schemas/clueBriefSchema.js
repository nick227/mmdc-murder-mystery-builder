const clueBriefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['item_name', 'target_name', 'strength', 'uniqueness_angle', 'description_seed'],
  properties: {
    item_name: { type: 'string' },
    target_name: { type: ['string', 'null'] },
    strength: { type: 'string', enum: ['low', 'mid', 'high'] },
    uniqueness_angle: { type: 'string' },
    description_seed: { type: 'string' }
  }
};

export function clueBriefsArraySchema(minItems = 1, maxItems = 12) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['briefs'],
    properties: {
      briefs: {
        type: 'array',
        minItems,
        maxItems,
        items: clueBriefSchema
      }
    }
  };
}
