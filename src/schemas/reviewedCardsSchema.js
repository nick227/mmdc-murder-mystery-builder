const reviewedCardSchema = {
  type: "object",
  additionalProperties: false,
  required: ["card_type", "card_title", "card_contents", "act"],
  properties: {
    card_type: { type: "string" },
    card_title: { type: "string" },
    card_contents: { type: "string" },
    act: { type: "integer", enum: [1, 2, 3] },
  },
};

export const reviewedCardsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cards"],
  properties: {
    cards: {
      type: "array",
      items: reviewedCardSchema,
    },
  },
};
