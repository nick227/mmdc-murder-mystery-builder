
import { callJson } from "../llm/client.js";
import { buildCluesPrompt } from "../prompts/cluesPrompt.js";
import { actedCardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function clueAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  if (!sealed.trails?.length) {
    throw new Error("No validated trails available for clue_agent");
  }

  const beatCount = sealed.trails.reduce(
    (count, trail) => count + ((trail.beats || []).length),
    0
  );

  const puzzles = Array.isArray(context.cards)
    ? context.cards.filter((c) => c?.card_type === "puzzle")
    : [];

  const prompt = buildCluesPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    narratives: sealed.narratives,
    puzzles
  });

  const result = await callJson({
    ...prompt,
    schemaName: "clue_cards",
    schema: actedCardsArraySchema(Math.max(6, beatCount - 1), Math.max(beatCount + 2, 8))
  });

  return pushCards(context, "clue", result.cards);
}
