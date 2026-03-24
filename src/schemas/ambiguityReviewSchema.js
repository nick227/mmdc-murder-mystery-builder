export const ambiguityReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "adjustments"],
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "killer_too_obvious",
        "opportunity_shared",
        "knowledge_shared",
        "elimination_too_early",
        "passes"
      ],
      properties: {
        killer_too_obvious: { type: "boolean" },
        opportunity_shared: { type: "boolean" },
        knowledge_shared: { type: "boolean" },
        elimination_too_early: { type: "boolean" },
        passes: { type: "boolean" }
      }
    },
    adjustments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["card_index"],
        properties: {
          card_index: { type: "integer" },

          title: { type: "string" },

          rewrite: { type: "string" },

          act: {
            type: "integer",
            enum: [1, 2, 3]
          }
        }
      }
    }
  }
};