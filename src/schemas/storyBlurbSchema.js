export const storyEntitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'summary'],
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' }
  }
};

/** Narrative premise only; card-ready entities come from world_building + story_metadata expansion. */
export const storyBlurbSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storyBlurb'],
  properties: {
    storyBlurb: { type: 'string' }
  }
};
