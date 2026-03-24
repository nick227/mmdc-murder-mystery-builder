export function buildNarrativesPrompt({ storyBlurb, solutions, trails, playerCount }) {
  return {
    system: [
      "You generate competing suspect narratives for a murder mystery.",
      "They are plausible explanations, not answer keys.",
      "Exactly one is true, but all three must feel viable.",
      "Each narrative must center on a different suspect.",
      "Each must contain contradiction hooks."
    ].join(" "),
    user: `
Create 3 competing suspect narratives for this mystery.

Public blurb:
${storyBlurb}

Private truth:
${JSON.stringify(solutions, null, 2)}

Breadcrumb scaffolding:
${JSON.stringify(trails, null, 2)}

Player count:
${playerCount}

Requirements:
- narrative a, b, c must each center on a different suspect
- each needs motive and opportunity
- each needs 2 to 4 supporting evidence points
- each needs 1 to 3 misleading evidence points
- each needs 1 to 3 contradiction hooks
- exactly one narrative is true
- keep all three debatable and coherent
- do not write direct answer-key language

Return:
{
  narratives: {
    a: {...},
    b: {...},
    c: {...},
    true_narrative: "a" | "b" | "c"
  }
}
`.trim()
  };
}
