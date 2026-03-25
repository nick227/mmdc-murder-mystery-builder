import { callText } from '../llm/client.js';
import { buildFortuneValidatorPrompt } from '../prompts/fortuneValidatorPrompt.js';

export async function fortuneValidatorAgent(context) {
  const prompt = buildFortuneValidatorPrompt(context);
  const text = await callText(prompt);
  if (!/pass|ok|valid/i.test(text)) {
    throw new Error(text);
  }
  return context;
}
