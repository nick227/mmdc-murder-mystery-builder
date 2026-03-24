export const cluesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cards"],
  properties: {
    cards: {
      type: "array",
      minItems: 5,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["card_title", "card_contents", "act"],
        properties: {
          card_title: { type: "string" },
          card_contents: { type: "string" },
          act: { type: "integer", enum: [1,2,3] }
        }
      }
    }
  }
};