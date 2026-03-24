import { callText } from "../llm/client.js";
import { buildStoryBlurbPrompt } from "../prompts/storyBlurbPrompt.js";

export async function storyBlurbAgent(context) {
  const prompt = buildStoryBlurbPrompt({
    userPrompt: context.userPrompt,
    playerCount: context.playerCount
  });

  context.storyBlurb = await callText(prompt);
  return context;
}
