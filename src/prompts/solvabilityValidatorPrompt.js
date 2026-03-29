
import { getMurderTruth } from '../utils/context.js';

function formatTruth(value) {
  return typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
}

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
${formatTruth(getMurderTruth(context))}

CARDS
${JSON.stringify(context.cards, null, 2)}
`
  };
}
