export const solutionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "killer",
    "murderMethod",
    "realSequence",
    "fortuneLocation",
    "misleadingAssumption"
  ],
  properties: {
    killer: { type: "string" },
    murderMethod: { type: "string" },
    realSequence: {
      type: "array",
      minItems: 4,
      items: { type: "string" }
    },
    fortuneLocation: { type: "string" },
    misleadingAssumption: { type: "string" }
  }
};
