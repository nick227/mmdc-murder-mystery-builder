export const coreTruthSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['murder', 'treasure'],
  properties: {
    murder: {
      type: 'object',
      additionalProperties: false,
      required: [
        'killer',
        'victim',
        'location',
        'method',
        'motive',
        'summary',
        'opportunity',
        'why_others_could_not'
      ],
      properties: {
        killer: { type: 'string' },
        victim: { type: 'string' },
        location: { type: 'string' },
        method: { type: 'string' },
        motive: { type: 'string' },
        summary: { type: 'string' },
        opportunity: { type: 'string' },
        why_others_could_not: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' }
        }
      }
    },
    treasure: {
      type: 'object',
      additionalProperties: false,
      required: [
        'object',
        'hiding_place',
        'concealment',
        'significance',
        'discovery_path'
      ],
      properties: {
        object: { type: 'string' },
        hiding_place: { type: 'string' },
        concealment: { type: 'string' },
        significance: { type: 'string' },
        discovery_path: { type: 'string' }
      }
    }
  }
};
