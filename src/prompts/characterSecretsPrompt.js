export function buildCharacterSecretsPrompt({ storyBlurb, trails, playerCount, narratives }) {
  return {
    system: [
      "You write hidden character secret cards for a murder mystery.",
      "Secrets must support or destabilize specific suspect narratives rather than float generically.",
      "Each secret should create leverage, contradiction, or withheld context.",
      "Do not let one secret solve the case."
    ].join(" "),
    user: `
Write exactly ${playerCount} character secret cards.

Story blurb:
${storyBlurb}

Breadcrumbs:
${JSON.stringify(trails, null, 2)}

Suspect narratives:
${JSON.stringify(narratives, null, 2)}

Rules:
- each secret must connect to the case
- each secret must primarily support or complicate one specific suspect narrative
- across the full set, distribute secrets across the narratives rather than clustering them around one suspect
- each secret must create suspicion, tension, leverage, contradiction, or withheld context
- no secret may fully explain the solution
- make secrets feel character-owned, not generic evidence notes

Return cards only.
`.trim()
  };
}
