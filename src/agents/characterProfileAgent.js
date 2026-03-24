import { callJson } from "../llm/client.js";
import { buildCharacterProfilesPrompt } from "../prompts/characterProfilesPrompt.js";
import { cardsArraySchema } from "../schemas/cardsSchema.js";
import { pushCards } from "../utils/cards.js";
import { buildSealedNarrativeContext } from "../utils/contextSeal.js";

export async function characterProfileAgent(context) {
  const sealed = buildSealedNarrativeContext(context);

  const prompt = buildCharacterProfilesPrompt({
    storyBlurb: sealed.storyBlurb,
    trails: sealed.trails,
    playerCount: sealed.playerCount,
    narratives: sealed.narratives
  });
  const count = sealed.playerCount;

  const result = await callJson({
    ...prompt,
    schemaName: "character_profiles",
    schema: cardsArraySchema(count, count)
  });

  // Character profiles are always act 1 — stamp at agent level
  const acted = result.cards.map((c) => ({ ...c, act: 1 }));
  return pushCards(context, "character", acted);
}
