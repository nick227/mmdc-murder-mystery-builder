import { callJson } from "../llm/client.js";

export async function contentRatingAgent(context) {
  const cards = Array.isArray(context.cards) ? context.cards : [];

  const candidates = cards
    .map((c, i) => ({ ...c, __index: i }))
    .filter(
      c => c.card_type === "clue" || c.card_type === "puzzle"
    );

  if (!candidates.length) return context;

  const prompt = {
    system:
      "Score deduction cards. Prefer concrete, non-redundant, solvable clues and puzzles. Keep only the strongest set.",
    user: JSON.stringify(candidates, null, 2)
  };

  const res = await callJson({
    ...prompt,
    schemaName: "rated_cards",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["cards"],
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["index", "score", "keep"],
            properties: {
              index: { type: "integer" },
              score: { type: "number" },
              keep: { type: "boolean" }
            }
          }
        }
      }
    }
  });

  const keep = new Set(
    res.cards
      .filter(c => c.keep)
      .map(c => c.index)
  );

  context.cards = context.cards.filter((c, i) => {
    if (c.card_type !== "clue" && c.card_type !== "puzzle") return true;
    return keep.has(i);
  });

  return context;
}
