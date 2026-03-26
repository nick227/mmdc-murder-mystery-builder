import { callJson } from '../llm/client.js';
import { buildFortuneValidatorPrompt } from '../prompts/fortuneValidatorPrompt.js';

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

export async function fortuneValidatorAgent(context) {
  const prompt = buildFortuneValidatorPrompt(context);
  const result = await callJson({
    ...prompt,
    schemaName: 'fortune_validation',
    schema
  });

  if (result.pass !== true) {
    throw new Error(
      'Fortune validation failed\n' +
      JSON.stringify(result.issues || [], null, 2)
    );
  }
  return context;
}
