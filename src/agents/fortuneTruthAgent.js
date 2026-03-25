import { callText } from '../llm/client.js';
import { buildFortuneTruthPrompt } from '../prompts/fortuneTruthPrompt.js';

export async function fortuneTruthAgent(context) {
  const prompt = buildFortuneTruthPrompt(context);

  const text = await callText(prompt);

  context.fortune_truth = text;

  return context;
}
