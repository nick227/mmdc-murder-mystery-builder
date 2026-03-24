
export function buildTrailsPrompt({ storyBlurb, solutions }) {
  return {
    system: `
You design investigation trails for a social deduction murder mystery.

Each trail is a sequence of discoveries that players must combine through conversation.
Trails must create ambiguity and require cross-player information sharing.
`.trim(),

    user: `
Create exactly 3 investigation trails.

Story:
${storyBlurb}

Hidden solution:
${JSON.stringify(solutions, null, 2)}

Each trail must contain:
- title
- goal (the key question solved by the trail)
- beats (3–4 steps)

Each beat must contain:
- information (what becomes known)
- game (how players obtain or combine this information)

Rules:
- each trail must follow a logical sequence of discoveries
- each beat must build on the previous beat
- at least one beat per trail must require two players combining information
- trails must point suspicion in different directions
- do not confirm the killer directly
- discoveries should be concrete, not vague behavior
- avoid repetition across trails

Return JSON only.
`.trim()
  };
}
