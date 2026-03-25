export function buildCharacterSecretsPrompt({ storyBlurb, character }) {
  return {
    system: `
You generate hidden secrets for a murder mystery character.

Rules:
- secrets must create suspicion
- secrets must not prove guilt
- secrets must be socially damaging or suspicious
- no murder mechanics
- no assigning killer
- keep concise
- secrets must relate to the character profile
`.trim(),

    user: `
Story:
${storyBlurb}

Character:
${character.card_title}

Profile:
${character.card_contents}

Return JSON only:

{
  "cards":[
    {
      "card_title":"Secret",
      "card_contents":"Hidden information creating suspicion"
    }
  ]
}
`
  };
}