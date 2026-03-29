export function buildTrailReviewPrompt({ storyBlurb, solution, trails, locations }) {
  return {
    system: [
      'You validate and repair investigation trails for a social deduction murder mystery.',
      'Return JSON only.',
      'Your job is to improve story coherence and solvability while preserving the three-trail structure.',
      'Trails must form logical sequences, build step-by-step, create deductions when combined, require player interaction, and avoid directly solving the mystery.'
    ].join(' '),

    user: `
Story:
${storyBlurb}

Solution:
${JSON.stringify(solution || {}, null, 2)}

Trails:
${JSON.stringify(trails, null, 2)}

Known locations:
${JSON.stringify(locations || [], null, 2)}

If trails are weak, rewrite them first and then validate the repaired version.

Preserve the three-trail intent when editing (same order, same count):
- trails[0]: red-herring lean (widen suspicion away from solution.killer, do not accuse a wrong killer)
- trails[1]: killer-aligned (tighten facts that later converge on solution.killer; never name the killer)
- trails[2]: ambiguous (could cut multiple ways until combined)

A strong trail:
- each beat depends on previous
- final beat creates deduction pressure
- at least one beat requires two players combining information
- beats are concrete discoveries
- trail does not confirm the killer

Return exactly this JSON shape:
{
  "pass": true,
  "problems": [],
  "roles": {
    "red_herring": true,
    "killer_aligned": true,
    "ambiguous": true
  },
  "trails": []
}

Validation rules:
- roles.red_herring is true only if trails[0] functions as a red-herring lean
- roles.killer_aligned is true only if trails[1] converges toward solution.killer without naming the killer
- roles.ambiguous is true only if trails[2] remains plausibly multi-interpretation until combined with other evidence
- preserve exactly three trails in the same order with 3-4 beats each
- every trail must include one valid location_ref from the known locations
- every trail should end with deduction pressure, not case closure
- pass can be true only if all three role flags are true and the repaired trails are coherent and non-solving
- each problems entry must be an object with shape { "type": "", "message": "" }
- use deterministic problem types when pass is false, including: missing_red_herring, missing_killer_alignment, missing_ambiguity, weak_progression, premature_solution
- problem.message should be short and specific
`
  };
}
