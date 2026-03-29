export const storyEntitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'summary'],
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' }
  }
};

export const storyBlurbSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storyBlurb', 'people', 'locations', 'items'],
  properties: {
    storyBlurb: { type: 'string' },
    people: {
      type: 'array',
      minItems: 0,
      maxItems: 4,
      items: storyEntitySchema
    },
    locations: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: storyEntitySchema
    },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: storyEntitySchema
    }
  }
};
