import { callText } from '../llm/client.js';
import { buildSolutionValidatorPrompt } from '../prompts/solutionValidatorPrompt.js';

export async function solutionValidatorAgent(context) {

  const prompt = buildSolutionValidatorPrompt(context.solutions);

  const text = await callText(prompt);

  if (!/pass|valid|ok/i.test(text)) {
    throw new Error(text);
  }

  return context;
}
