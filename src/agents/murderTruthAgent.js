import { callText } from '../llm/client.js';
import { buildMurderTruthPrompt } from '../prompts/murderTruthPrompt.js';

export async function murderTruthAgent(context) {
  const prompt = buildMurderTruthPrompt(context);

  const text = await callText(prompt);

  context.murder_truth = text;

  return context;
}
