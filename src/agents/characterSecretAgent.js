import { callJson } from "../llm/client.js";
import { buildCharacterSecretsPrompt } from "../prompts/characterSecretsPrompt.js";
import { actedCardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function characterSecretAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  const prompt = buildCharacterSecretsPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    playerCount: sealed.playerCount,
    narratives: sealed.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: "character_secrets",
    schema: actedCardsArraySchema(context.playerCount, context.playerCount)
  });

  return pushCards(context, "character_secret", result.cards);
}
