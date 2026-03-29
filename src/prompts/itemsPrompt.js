export function buildItemsPrompt({ storyBlurb, trails, narratives, characters, people, locations, existingItems, rejectionReasons = [] }) {
  return {
    system: [
      'You write item cards for a murder mystery.',
      'Write observable facts only.',
      'Do not perform deduction.',
      'Do not explain reasoning.',
      'Items should describe inspectable objects, not interpretations.',
      'Prefer recurring world entities and seeded investigation nouns over inventing brand-new important objects.'
    ].join(' '),
    user: `
Write item cards from the breadcrumb objects and suspect narratives below.

Story blurb:
${storyBlurb}

Breadcrumbs:
${JSON.stringify(trails, null, 2)}

Suspect narratives:
${JSON.stringify(narratives, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

World people:
${JSON.stringify(people || [], null, 2)}

World locations:
${JSON.stringify(locations || [], null, 2)}

Existing item cards:
${JSON.stringify(existingItems || [], null, 2)}

Recent invalid-generation reasons to avoid:
${JSON.stringify(rejectionReasons || [], null, 2)}

Rules:
- items must be physical or inspectable things
- item descriptions should focus on what the item is and where it was found
- include location_ref when a supplied known location is the item's primary anchor
- do not repeat witness testimony that belongs in clue cards
- avoid decorative filler
- do not state conclusions
- prefer items tied to the supplied locations, people, and recurring treasure/mechanism nouns when suitable
- do not restate the same suspect + axis + object/location fact in slightly different wording
`.trim()
  };
}
