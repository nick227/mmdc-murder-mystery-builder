export function buildCharactersBuilderPrompt({ storyBlurb, world, worldPeople, playerCount }) {
  return {
    system: `
Generate exactly ${playerCount} playable suspect character cards for a murder mystery party.

Output is the canonical suspect roster: each card has card_title and card_contents only.
Distinct names, contrasting roles, worth suspecting. No killer assignment or murder mechanics.

Return JSON only.
`.trim(),

    user: `
Story:
${storyBlurb || ''}

World:
${world || ''}

World people (reuse or ignore as you like):
${JSON.stringify(worldPeople || [], null, 2)}

Player count: ${playerCount}
`.trim()
  };
}
