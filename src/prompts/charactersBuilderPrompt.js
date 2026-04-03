export function buildCharactersBuilderPrompt({ storyBlurb, storyMeta, world, playerCount }) {
  return {
    system: `
Generate exactly ${playerCount} playable suspect character cards for a murder mystery party.

Output is the canonical suspect roster: each card has card_title and card_contents only.
Distinct names, contrasting roles, worth suspecting. No killer assignment or murder mechanics.

Honor theme tags and host pitch from the packaging block when shaping motives and flavor.

Return JSON only.
`.trim(),

    user: `
Story concept:
${storyBlurb || ''}

Packaging and thematic guidance:
${storyMeta || '(none)'}

World:
${world || ''}

Player count: ${playerCount}
`.trim()
  };
}
