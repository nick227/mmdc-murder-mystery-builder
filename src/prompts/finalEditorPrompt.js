export function buildFinalEditorPrompt({ storyBlurb, trails, narratives, misleadingAssumption }) {
  return {
    system: [
      "You are the final quality editor for a murder mystery card set.",
      "Tighten cohesion, remove redundancy, preserve deduction, and eliminate solution leakage.",
      "You do not know who the killer is. Work only from the competing narratives.",
      "Return only JSON."
    ].join(" "),
    user: `
Edit this card set for final cohesion.

Story blurb:
${storyBlurb}

Competing suspect narratives (all plausible — do not treat any as confirmed truth):
${JSON.stringify(narratives, null, 2)}

Trails:
${JSON.stringify(trails, null, 2)}

Known misleading assumption players may carry:
${misleadingAssumption || "Unknown"}

Cards:
${JSON.stringify([], null, 2)}

Rules:
- preserve the mystery logic across all three narratives
- keep card_type values unchanged
- do not let any card directly state the solution
- prefer implication, pressure, and evidence over conclusion
- ensure clue and item cards feel like physical evidence, not summaries
- ensure acts and host speeches frame mystery rather than solve it
- ensure each major card cluster contributes unique value
- remove obvious repetition — if two cards make the same point, merge or cut one
- preserve act field on cards that have one

Return a polished final card list only.
`.trim()
  };
}

export function buildSolvabilityPrompt({ storyBlurb, solutions, narratives, cards }) {
  return {
    system: [
      "You are a solvability validator for a murder mystery card set.",
      "Your only job is to verify the game is winnable: that the true solution can be deduced from the cards without being given away.",
      "You know the full truth. Use it only to verify, not to rewrite flavor text.",
      "Return only JSON."
    ].join(" "),
    user: `
Validate that this card set is solvable and fair.

Story blurb:
${storyBlurb}

Full private truth (for validation only):
${JSON.stringify(solutions, null, 2)}

True narrative:
${JSON.stringify(narratives?.[solutions ? "true" : "a"] || narratives?.a, null, 2)}

All generated cards:
${JSON.stringify(cards, null, 2)}

Solvability checks:
1. Can the killer be deduced from at least 2 different card types (clue + character secret, item + puzzle, etc)?
2. Can the fortune location be inferred from at least 1 clue or item card?
3. Is the misleading assumption represented as a red herring in at least 1 card?
4. Do the three suspect narratives each have at least 1 supporting card?
5. Is the true narrative's key evidence present without being explicitly labeled as "the answer"?

Return a JSON object:
{
  "solvable": true | false,
  "issues": ["list any missing evidence gaps"],
  "passed_checks": ["list checks that passed"]
}
`.trim()
  };
}
