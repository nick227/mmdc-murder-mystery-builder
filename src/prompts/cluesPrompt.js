
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
`.trim(),

    user: `
Story:
${storyBlurb}

Trails:
${JSON.stringify(trails, null, 2)}

Narratives:
${JSON.stringify(narratives, null, 2)}

Playable characters:
${characters}

Generate clue cards.
Return:
{
  "cards":[
    {
      "card_title":"",
      "card_contents":""
    }
  ]
}
`
  };
}
