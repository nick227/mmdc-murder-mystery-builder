
export function buildCharactersBuilderPrompt({ storyBlurb, playerCount }) {
  return {
    system: `
You generate character cards for a murder mystery.- 

CHARACTER NAMES: Use evocative, descriptive names that hint at their role.

Rules:
- generate exactly playerCount characters
- distinct personalities
- socially suspicious roles
- no killer assignment
- no murder mechanics
`.trim(),

    user: `
Story:
${storyBlurb}

Player Count:
${playerCount}

Return:
{
  "cards":[
    {
      "card_title":"Character name",
      "card_contents":"Role and short bio"
    }
  ]
}
`
  };
}
