import { storyEntitySchema } from './storyBlurbSchema.js';

export const worldBuildingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['world', 'people', 'locations', 'items'],
  properties: {
    world: { type: 'string' },
    people: {
      type: 'array',
      minItems: 0,
      maxItems: 4,
      items: storyEntitySchema
    },
    locations: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: storyEntitySchema
    },
    items: {
      type: 'array',
      minItems: 0,
      maxItems: 5,
      items: storyEntitySchema
    }
  }
};
