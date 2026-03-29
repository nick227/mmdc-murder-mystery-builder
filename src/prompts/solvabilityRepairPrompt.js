
import { getMurderTruth } from '../utils/context.js';

function formatTruth(value) {
  return typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
}

export function buildSolvabilityRepairPrompt(context, problems) {
  return {
    system: `
You repair a murder mystery.

Return JSON:

{ "cards": [...] }

Rules:
- do not add cards
- do not remove cards
- do not reorder cards
- keep titles if possible
- only rewrite contents unless necessary
`.trim(),

    user: `
PROBLEMS
${JSON.stringify(problems, null, 2)}

CARDS
${JSON.stringify(context.cards, null, 2)}

MURDER TRUTH
${formatTruth(getMurderTruth(context))}
`
  };
}
