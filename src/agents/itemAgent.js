import { callJson } from "../llm/client.js";
import { buildItemsPrompt } from "../prompts/itemsPrompt.js";
import { actedCardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function itemAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  if (!sealed.trails?.length) {
    throw new Error("No validated trails available for item_agent");
  }

  const objects = new Set(
    sealed.trails.flatMap((trail) =>
      (trail.beats || [])
        .map((step) => step.object)
        .filter(Boolean)
    )
  );

  const prompt = buildItemsPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    narratives: sealed.narratives
  });

  const result = await callJson({
    ...prompt,
    schemaName: "item_cards",
    schema: actedCardsArraySchema(
      Math.max(4, objects.size - 1),
      Math.max(objects.size + 2, 8)
    )
  });

  return pushCards(context, "item", result.cards);
}
