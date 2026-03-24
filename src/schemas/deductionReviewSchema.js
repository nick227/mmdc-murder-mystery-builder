
export const deductionReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "cards"],
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "has_timeline_pressure",
        "has_object_chain",
        "has_contradiction",
        "has_elimination",
        "passes"
      ],
      properties: {
        has_timeline_pressure: { type: "boolean" },
        has_object_chain: { type: "boolean" },
        has_contradiction: { type: "boolean" },
        has_elimination: { type: "boolean" },
        passes: { type: "boolean" }
      }
    },
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["card_index", "card_type", "score", "keep", "reason"],
        properties: {
          card_index: { type: "integer" },
          card_type: { type: "string", enum: ["clue", "puzzle"] },
          score: { type: "integer", minimum: 1, maximum: 10 },
          keep: { type: "boolean" },
          reason: { type: "string" }
        }
      }
    }
  }
};
