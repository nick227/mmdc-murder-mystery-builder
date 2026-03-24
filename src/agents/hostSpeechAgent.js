import { callJson } from "../llm/client.js";
import { buildHostSpeechPrompt } from "../prompts/hostSpeechPrompt.js";
import { actedSimpleCardsSchema } from "../schemas/simpleCardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function hostSpeechAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  const prompt = buildHostSpeechPrompt({
    storyBlurb: sealed.storyBlurb,
    narratives: sealed.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: "host_speech",
    schema: actedSimpleCardsSchema
  });

  return pushCards(context, "host_speech", result.cards);
}
