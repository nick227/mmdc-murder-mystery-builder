export function buildStoryActsPrompt({ storyBlurb, narratives, characters, locations }) {
  return {
    system: [
      'You write structured story act cards for a live murder mystery host.',
      'Never reveal the killer, never state the exact solution, and never collapse the mystery into a conclusion.',
      'Acts should frame tension, shift focus, and introduce new questions.',
      'You do not know who the killer is. Work only from the competing narratives.',
      'Each act card must be tagged with its act number.'
    ].join(' '),
    user: `
Create exactly 3 story act cards for this murder mystery.

Public blurb:
${storyBlurb}

Competing suspect narratives (all are plausible - do not treat any as confirmed truth):
${JSON.stringify(narratives ?? [], null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Known locations:
${JSON.stringify(locations || [], null, 2)}

Act structure and act field assignments:
- Act 1 (act: 1) - opening setup: establish characters, surface first tensions, introduce the crime
- Act 2 (act: 2) - mid-game escalation: shift suspicion, surface a contradiction, raise stakes
- Act 3 (act: 3) - final deduction phase: pressure players to commit, narrow focus, do not solve

Each act card must:
- advance the mystery without resolving it
- guide player attention toward a different angle or suspect
- increase pressure, uncertainty, or focus
- feel like a natural story beat, not a game instruction
- include the correct act field (1, 2, or 3)

Rules:
- do not name or imply one suspect as the confirmed killer
- do not state the fortune location as settled fact
- keep all three narratives live and debatable through Act 2
- Act 3 may narrow focus but must preserve the final deduction gap
- return exactly 3 cards with act fields 1, 2, and 3 respectively
- all suspects must be from playable characters
- each act must center on one main known location and include its location_ref
`.trim()
  };
}
