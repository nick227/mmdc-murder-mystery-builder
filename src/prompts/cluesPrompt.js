export function buildCluesPrompt({ storyBlurb, trails, narratives, characters, people, locations, items, clueTargets, puzzleBundles }) {
  return {
    system: `
You generate concrete clue cards.

These are OBJECTIVE FACTS.

Rules:
- write observable facts only
- do not perform deduction
- do not explain reasoning
- do not identify the killer
- do not state conclusions
- no implication language such as "suggests", "indicates", or "points toward"
- use only existing suspects, locations, and objects
- do not restate a puzzle bundle's hidden answer as an open clue card
- do not duplicate the same physical fact across multiple clues with minor wording changes
- each open clue should add a new observable detail, not echo bundle solution text
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

World people:
${JSON.stringify(people || [], null, 2)}

Known locations:
${JSON.stringify(locations || [], null, 2)}

Known items:
${JSON.stringify(items || [], null, 2)}

Clue targets already reserved for hidden puzzle answers:
${JSON.stringify(clueTargets || [], null, 2)}

Puzzle bundle solution summaries already in the chain:
${JSON.stringify(puzzleBundles || [], null, 2)}

Generate clue cards.
Return:
{
  "cards":[
    {
      "card_title":"",
      "card_contents":"",
      "location_ref":"",
      "act": 1,
      "trail_role": "red_herring"
    }
  ]
}

Act and trail-role rules:
- if trail_role is "red_herring", act must be 1
- if trail_role is "ambiguous", act must be 2
- if trail_role is "killer_aligned", act must be 3
- use supplied people, locations, and items when they fit instead of inventing new recurring nouns
- most clues should include location_ref pointing to the primary known location involved
- avoid repeating any reserved clue target or puzzle bundle solution summary in open-clue form
`
  };
}
