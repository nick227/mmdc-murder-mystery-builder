import { callJson } from "../llm/client.js";
import { buildGameCardsPrompt } from "../prompts/gameCardsPrompt.js";
import { actedCardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function gameCardAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  if (!sealed.trails?.length) {
    throw new Error("No validated trails available for game_card_agent");
  }

  const count = Math.max(context.playerCount * 2, 8);

  const prompt = buildGameCardsPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    playerCount: sealed.playerCount,
    narratives: sealed.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: "game_cards",
    schema: actedCardsArraySchema(count, count + 2)
  });

  return pushCards(context, "game_card", result.cards);
}
