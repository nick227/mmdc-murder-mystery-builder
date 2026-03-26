import { callJson } from '../llm/client.js';
import { buildMurderValidatorPrompt } from '../prompts/murderValidatorPrompt.js';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'issues'],
  properties: {
    pass: { type: 'boolean' },
    issues: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

export async function murderValidatorAgent(context) {
  const prompt = buildMurderValidatorPrompt(context);
  const result = await callJson({
    ...prompt,
    schemaName: 'murder_validation',
    schema
  });

  if (result.pass !== true) {
    throw new Error(
      'Murder validation failed\n' +
      JSON.stringify(result.issues || [], null, 2)
    );
  }
  return context;
}
