export function buildTrailReviewPrompt({ storyBlurb, solutions, trails }) {
  return {
    system: `
You review investigation trails for a social deduction murder mystery.

Your job is to improve story coherence and solvability.

Trails must:
- form logical sequences
- build step-by-step
- create deductions when beats are combined
- require player interaction
- avoid directly solving the mystery
`.trim(),

    user: `
Story:
${storyBlurb}

Solution:
${JSON.stringify(solutions, null, 2)}

Trails:
${JSON.stringify(trails, null, 2)}

If trails are weak, rewrite them.

A strong trail:
- each beat depends on previous
- final beat creates deduction pressure
- at least one beat requires two players combining information
- beats are concrete discoveries
- trail does not confirm the killer

Return improved trails.
`
  };
}