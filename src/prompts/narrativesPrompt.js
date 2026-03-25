export function buildNarrativesPrompt({ storyBlurb, solutions, trails, playerCount }) {
  return {
    system: [
      'You generate competing suspect narratives for a murder mystery.',
      'These are SOCIAL STORIES and VIBES — not forensic evidence.',
      'Exactly one is true (the killer), but all three must feel viable.',
      'Each narrative must center on a different suspect.',
      'Do NOT invent physical evidence or new objects.',
      'Do NOT create exact timelines.',
      'The selected true_narrative MUST match solutions.killer by suspect name.'
    ].join(' '),
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
- each needs suspicious social behavior, vague movement, or emotional reactions
- each needs 1 to 3 contradiction hooks
- exactly one narrative is true
- keep all three debatable and coherent
- do not write direct answer-key language
- do not invent physical evidence, forensic proof, or new objects
- the narrative whose suspect matches solutions.killer must be the selected true_narrative
- the killer narrative must not describe them as innocent, excluded, or a red herring
- non-killer narratives may sound plausible, but must remain socially suspicious rather than mechanically proven

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
