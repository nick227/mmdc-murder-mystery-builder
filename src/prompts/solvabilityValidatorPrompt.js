
export function buildSolvabilityValidatorPrompt(context) {
  return {
    system: `
You validate solvability of a murder mystery.

Return JSON:

{
  "pass": boolean,
  "problems": string[]
}

Rules:
- exactly one killer
- killer has motive, method, opportunity
- no impossible timeline
- no mutually exclusive facts
- clues allow deduction
`.trim(),

    user: `
MURDER TRUTH
${context.murder_truth}

CARDS
${JSON.stringify(context.cards, null, 2)}
`
  };
}
