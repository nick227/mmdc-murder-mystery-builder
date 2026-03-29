import { callJson } from '../llm/client.js';
import { buildNarrativeValidatorPrompt } from '../prompts/narrativeValidatorPrompt.js';
import { getSolution, getStoryBlurb } from '../utils/context.js';
import { getCharacterCards } from '../utils/cards.js';

const narrativeValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'problems', 'analysis'],
  properties: {
    pass: { type: 'boolean' },
    problems: {
      type: 'array',
      minItems: 0,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'message'],
        properties: {
          type: { type: 'string' },
          message: { type: 'string' }
        }
      }
    },
    analysis: {
      type: 'object',
      additionalProperties: false,
      required: [
        'suspects',
        'true_suspect',
        'eliminated_suspect',
        'red_herring',
        'uses_only_characters',
        'matches_solution',
        'deduction_possible'
      ],
      properties: {
        suspects: {
          type: 'array',
          minItems: 3,
          items: { type: 'string' }
        },
        true_suspect: { type: 'string' },
        eliminated_suspect: { type: 'string' },
        red_herring: { type: 'string' },
        uses_only_characters: { type: 'boolean' },
        matches_solution: { type: 'boolean' },
        deduction_possible: { type: 'boolean' }
      }
    }
  }
};

export async function narrativeValidatorAgent(context) {
  const prompt = buildNarrativeValidatorPrompt({
    storyBlurb: getStoryBlurb(context),
    solution: getSolution(context),
    trails: context.trails,
    narratives: context.narratives,
    characters: getCharacterCards(context.cards)
  });

  const result = await callJson({
    ...prompt,
    schemaName: 'narrative_validation',
    schema: narrativeValidationSchema
  });

  context.narrative_validation = result;

  if (result.pass !== true) {
    throw new Error(
      'Narrative validation failed\n' +
      JSON.stringify(result, null, 2)
    );
  }

  return context;
}
