import { callJson } from "../llm/client.js";
import { buildPlayerActivityPrompt } from "../prompts/playerActivityPrompt.js";
import { actedCardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function playerActivityAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  if (!sealed.trails?.length) {
    throw new Error("No validated trails available for player_activity_agent");
  }

  const total = context.playerCount * 3;

  const prompt = buildPlayerActivityPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    playerCount: sealed.playerCount,
    narratives: sealed.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: "player_activity",
    schema: actedCardsArraySchema(total, total + 2)
  });

  return pushCards(context, "player_activity", result.cards);
}
