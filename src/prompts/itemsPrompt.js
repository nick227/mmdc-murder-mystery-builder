export function buildItemsPrompt({ storyBlurb, trails, narratives }) {
  return {
    system: [
      "You write item cards for a murder mystery.",
      "Items must be concrete, useful, and tied to deduction across competing narratives.",
      "Items should describe inspectable objects, not restate clue interpretations."
    ].join(" "),
    user: `
Write item cards from the breadcrumb objects and suspect narratives below.

Story blurb:
${storyBlurb}

Breadcrumbs:
${JSON.stringify(trails, null, 2)}

Suspect narratives:
${JSON.stringify(narratives, null, 2)}

Rules:
- items must be physical or inspectable things
- item descriptions should focus on what the item is, where it was found, and what it might suggest
- do not repeat witness testimony that belongs in clue cards
- avoid decorative filler
- do not let an item description fully solve the case
- preserve uncertainty where appropriate
`.trim()
  };
}
