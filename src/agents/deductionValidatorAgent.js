
import { callJson } from "../llm/client.js";
import { deductionReviewSchema } from "../schemas/deductionReviewSchema.js";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export async function deductionValidatorAgent(context) {
  const cards = ensureArray(context.cards);
  const candidates = cards
    .map((card, index) => ({ ...card, card_index: index }))
    .filter((card) => card?.card_type === "clue" || card?.card_type === "puzzle");

  if (!candidates.length) {
    return context;
  }

  const prompt = {
    system: `
You review deduction content for a murder mystery game.

Your job is to judge whether the clue and puzzle set creates real deduction.
A strong set should include:
- timeline pressure
- object / ownership / handling chains
- contradictions
- elimination pressure
- non-redundant puzzle support

Keep the strongest clue and puzzle cards.
Reject cards that merely restate story beats, restate narrative summaries,
or repeat the same idea without adding deduction value.
`.trim(),

    user: `
Story:
${context.storyBlurb || ""}

Trails:
${JSON.stringify(context.trails || [], null, 2)}

Narratives:
${JSON.stringify(context.narratives || {}, null, 2)}

Cards to review:
${JSON.stringify(candidates, null, 2)}

Review the cards.

Return:
- a summary of whether the set has enough deduction structure
- a per-card keep/drop decision with score and short reason

Prefer keeping cards that:
- support puzzles
- create comparison
- create timeline or access logic
- help eliminate a suspect
- add concrete evidence

Prefer dropping cards that:
- repeat another card
- merely summarize a suspect narrative
- only say someone argued or seemed suspicious
- are too vague to help deduction
`.trim()
  };

  const result = await callJson({
    ...prompt,
    schemaName: "deduction_review",
    schema: deductionReviewSchema
  });

  const keepSet = new Set(
    ensureArray(result.cards)
      .filter((entry) => entry.keep)
      .map((entry) => entry.card_index)
  );

  context.cards = cards.filter((card, index) => {
    if (card?.card_type !== "clue" && card?.card_type !== "puzzle") {
      return true;
    }
    return keepSet.has(index);
  });

  context.deduction_review = result.summary;
  return context;
}
