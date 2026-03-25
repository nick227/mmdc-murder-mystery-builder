import { callText } from '../llm/client.js';
import { buildNarrativeValidatorPrompt } from '../prompts/narrativeValidatorPrompt.js';

export async function narrativeValidatorAgent(context) {
  const prompt = buildNarrativeValidatorPrompt(context);
  const text = await callText(prompt);
  if (!/pass|ok|valid/i.test(text)) {
    throw new Error(text);
  }
  return context;
}
