import { callText } from '../llm/client.js';
import { buildWorldBuildingPrompt } from '../prompts/worldBuildingPrompt.js';

export async function worldBuildingAgent(context) {
  const prompt = buildWorldBuildingPrompt(context);
  const text = await callText(prompt);
  context.world = text;
  return context;
}
