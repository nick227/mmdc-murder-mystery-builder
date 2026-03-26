function formatWorld(world) {
  return typeof world === 'string' ? world : JSON.stringify(world || '', null, 2);
}

function killerAllowList(characters) {
  return (Array.isArray(characters) ? characters : [])
    .map((c) => String(c?.card_title || '').trim())
    .filter(Boolean);
}

export function buildSolutionPrompt({ storyBlurb, murder, fortune, world, characters }) {
  const allowedKillers = killerAllowList(characters);

  return {
    system: `
You extract a minimal hidden solution object for a murder mystery.

Rules:
- exactly one killer
- killer MUST be exactly one of the playable character names listed (match card_title spelling)
- killer must physically commit the murder
- murder method must be concrete
- murder location must be concrete
- motive must be explicit
- do not invent new suspects
- derive killer, method, location, motive only from the murder truth, fortune truth, story, and world
- return JSON only with: killer, method, location, motive
`.trim(),

    user: `
Story:
${storyBlurb}

World:
${formatWorld(world)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Killer must be EXACTLY one of these strings (copy verbatim — no aliases, no titles, no spelling variants):
${allowedKillers.length ? allowedKillers.join('\n') : '(none — invalid input)'}

Murder truth:
${murder}

Fortune truth:
${fortune}

Return the minimal hidden solution object.
`.trim()
  };
}
