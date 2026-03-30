export function buildCharacterSecretsPrompt({ storyBlurb, characterName, rejectionReasons = [] }) {
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
- generate exactly 2 secrets for this character
- at least 1 secret must provide an explicit motive for this character
- the motive must be stated directly, not implied: clearly say why this character wanted the victim dead or the treasure stolen/controlled
- across the 2 secrets together, this character must have:
  1. at least 1 logistical hook from: access, movement, location, object/means
  2. at least 1 competitive hook from: motive, contradiction, opportunity
- do not output flavor-only embarrassment or romance unless it also affects suspicion materially
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

Make one secret concrete and logistical, such as:
- unauthorized access
- being seen in a key place
- handling a suspicious object
- conflicting alibi
- debt, threat, jealousy, leverage, inheritance pressure, or rivalry tied to the victim or treasure

Hard requirement:
- one secret must explicitly state a motive in plain language, for example "X wanted the victim silenced because..." or "X wanted the treasure because..."

Retry guidance:
${JSON.stringify(rejectionReasons || [], null, 2)}
`
  };
}
