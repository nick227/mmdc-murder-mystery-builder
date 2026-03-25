import { callText } from '../llm/client.js';
import { buildMurderValidatorPrompt } from '../prompts/murderValidatorPrompt.js';

export async function murderValidatorAgent(context) {
  const prompt = buildMurderValidatorPrompt(context);
  const text = await callText(prompt);
  if (!/pass|ok|valid/i.test(text)) {
    throw new Error(text);
  }
  return context;
}
