const suspectNarrativeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'suspect',
    'motive',
    'opportunity',
    'supporting_evidence',
    'misleading_evidence',
    'contradiction_hooks',
    'narrative_arc'
  ],
  properties: {
    suspect: { type: 'string' },
    motive: { type: 'string' },
    opportunity: { type: 'string' },
    supporting_evidence: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string' }
    },
    misleading_evidence: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string' }
    },
    contradiction_hooks: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string' }
    },
    narrative_arc: { type: 'string' }
  }
};

export const narrativesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['narratives'],
  properties: {
    narratives: {
      type: 'object',
      additionalProperties: false,
      required: ['a', 'b', 'c', 'true_narrative'],
      properties: {
        a: suspectNarrativeSchema,
        b: suspectNarrativeSchema,
        c: suspectNarrativeSchema,
        true_narrative: { type: 'string', enum: ['a', 'b', 'c'] }
      }
    }
  }
};
