import { callJson } from "../llm/client.js";
import { buildPuzzlePrompt } from "../prompts/puzzlePrompt.js";
import { actedCardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function puzzleAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  if (!sealed.trails?.length) {
    throw new Error("No validated trails available for puzzle_agent");
  }

  const puzzleCount = context.playerCount >= 5 ? 3 : 2;

  const prompt = buildPuzzlePrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    narratives: sealed.narratives,
    puzzleCount
  });

  const result = await callJson({
    ...prompt,
    schemaName: "puzzle_cards",
    schema: actedCardsArraySchema(puzzleCount, puzzleCount)
  });

  return pushCards(context, "puzzle", result.cards);
}
