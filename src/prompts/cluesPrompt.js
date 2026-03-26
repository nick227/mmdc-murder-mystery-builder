export function buildCluesPrompt({ storyBlurb, trails, narratives, characters }) {
  return {
    system: `
You generate deduction-driven clue cards.

These are OBJECTIVE FACTS.

Rules:
- introduce concrete facts
- no single clue solves case
- use only existing suspects/locations/objects
- no emotional observations
- clues must combine for deduction
- clues must follow this act progression:
  - Act 1 -> red_herring trail material
  - Act 2 -> ambiguous trail material
  - Act 3 -> killer_aligned trail material
`.trim(),

    user: `
Story:
${storyBlurb}

Trails:
${JSON.stringify(trails, null, 2)}

Reviewed trail order:
- trails[0] = red_herring
- trails[1] = killer_aligned
- trails[2] = ambiguous

Narratives:
${JSON.stringify(narratives, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Generate clue cards.
Return:
{
  "cards":[
    {
      "card_title":"",
      "card_contents":"",
      "act": 1,
      "trail_role": "red_herring"
    }
  ]
}

Act and trail-role rules:
- if trail_role is "red_herring", act must be 1
- if trail_role is "ambiguous", act must be 2
- if trail_role is "killer_aligned", act must be 3
- Act 1 clues should widen suspicion
- Act 2 clues should preserve uncertainty while increasing pressure
- Act 3 clues should converge on the real solution without a single decisive reveal
`
  };
}
