
export function buildCluesPrompt({ storyBlurb, trails, narratives, puzzles }) {
  return {
    system: `
You design deduction-driven clue cards for a social murder mystery.

Clues must introduce NEW information players can reason about.
Clues are not summaries, not rumors, not emotional observations.

Good clues:
- constrain timeline
- limit access
- reveal object movement
- create contradiction
- create overlap between suspects

Bad clues:
- "X seemed nervous"
- "Y argued earlier"
- "Z wanted the money"
- narrative restatements

No single clue may uniquely identify the killer.
The killer should only emerge when multiple clues are combined.

Prefer clues that:
- implicate more than one suspect
- require comparison
- require discussion
- create uncertainty
`.trim(),

    user: `
Story:
${storyBlurb}

Trails:
${JSON.stringify(trails, null, 2)}

Narratives:
${JSON.stringify(narratives, null, 2)}

Puzzles:
${JSON.stringify(puzzles, null, 2)}

Generate a strong final set of clue cards.

Requirements:
- every clue must help answer at least one puzzle
- do not restate trail beats in slightly different words
- do not restate narrative summaries
- each clue must introduce a concrete, discussable fact
- clues should work together to support deduction
- at least 2 clues must create timeline pressure
- at least 2 clues must involve object ownership, handling, or location
- at least 2 clues must create or expose contradictions
- at least 1 clue must help eliminate a suspect or weaken an easy assumption
- avoid filler, flavor-only details, and vague emotional observations
- do not directly say who the killer is
- do not directly confirm the final fortune location as solved fact unless the clue itself is only partial evidence

Each clue must contain:
- card_title
- card_contents
- act (1, 2, or 3)

Prefer clues that become stronger when paired with another clue.

Return cards only.
`.trim()
  };
}
