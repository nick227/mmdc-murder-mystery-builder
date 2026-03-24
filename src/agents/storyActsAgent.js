import { callJson } from "../llm/client.js";
import { buildStoryActsPrompt } from "../prompts/storyActsPrompt.js";
import { actedSimpleCardsSchema } from "../schemas/simpleCardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function storyActsAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  const prompt = buildStoryActsPrompt({
    storyBlurb: sealed.storyBlurb,
    narratives: sealed.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: "story_acts",
    schema: actedSimpleCardsSchema
  });

  return pushCards(context, "story_act", result.cards);
}
