export function buildCharacterSecretsPrompt({ storyBlurb, characterName }) {
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
- secrets should be driven by story context and social dynamics
`.trim(),

    user: `
Story:
${storyBlurb}

Character:
${characterName}

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
