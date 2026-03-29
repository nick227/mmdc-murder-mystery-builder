export const clueTargetsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['targets'],
  properties: {
    targets: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fact', 'category', 'act', 'puzzle_type_hint', 'difficulty_hint'],
        properties: {
          fact: { type: 'string' },
          category: {
            type: 'string',
            enum: ['timing', 'location', 'access', 'ownership', 'movement', 'object']
          },
          act: {
            type: ['integer', 'null'],
            enum: [1, 2, 3, null]
          },
          puzzle_type_hint: {
            type: ['string', 'null'],
            enum: ['cross_reference', 'timeline', 'item_combination', 'elimination', 'cipher', null]
          },
          difficulty_hint: {
            type: ['string', 'null'],
            enum: ['easy', 'medium', 'hard', null]
          }
        }
      }
    }
  }
};

export const clueTargetSingleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['target'],
  properties: {
    target: {
      type: 'object',
      additionalProperties: false,
      required: ['fact', 'category', 'act', 'puzzle_type_hint', 'difficulty_hint'],
      properties: {
        fact: { type: 'string' },
        category: {
          type: 'string',
          enum: ['timing', 'location', 'access', 'ownership', 'movement', 'object']
        },
        act: {
          type: ['integer', 'null'],
          enum: [1, 2, 3, null]
        },
        puzzle_type_hint: {
          type: ['string', 'null'],
          enum: ['cross_reference', 'timeline', 'item_combination', 'elimination', 'cipher', null]
        },
        difficulty_hint: {
          type: ['string', 'null'],
          enum: ['easy', 'medium', 'hard', null]
        }
      }
    }
  }
};
