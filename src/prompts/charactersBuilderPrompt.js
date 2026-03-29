
export function buildCharactersBuilderPrompt({ storyBlurb, world, worldPeople, playerCount }) {
  return {
    system: `
You generate the playable suspect cast for a murder mystery.

This is a casting step.

Rules:
- generate exactly playerCount playable character cards
- treat the playable character cards as the canonical suspect roster
- if you reuse an existing world person, keep the same base identity/name rather than duplicating them as a second separate entity
- playable characters must be socially suspicious, interactive, and plausible suspects
- every playable character must have believable motive, means, and opportunity potential
- every playable character must visibly support at least 2 deduction axes in the profile text, chosen from: motive, access, opportunity, weapon/means, contradiction
- avoid pure investigator, detective, police, or host-facilitator roles unless they are still genuinely suspicious and socially entangled
- distinct personalities, motives, and social roles
- optimize for story tension, deduction value, and roleplay energy
- if existing world people are useful, you may adapt them into the playable cast
- do not feel obligated to use any existing world person
- if existing world people are weak, background-only, or lore-only, ignore them and invent a stronger cast
- no killer assignment
- no murder mechanics
- use strong, memorable names that fit the tone and hint at role or personality
`.trim(),

    user: `
Build the playable suspect cast for this mystery.

Story blurb:
${storyBlurb}

World:
${world || ''}

Existing world people you may borrow from if useful:
${JSON.stringify(worldPeople || [], null, 2)}

Player Count:
${playerCount}

Goal:
- choose the most interesting playable cast for the game
- prioritize suspect contrast, social friction, and memorable public personas
- make each character easy to roleplay and easy to suspect for different reasons
- make each profile explicitly mention concrete suspicious leverage such as a key, route, room access, quarrel, debt, threat, missing object, weapon familiarity, false alibi, or hidden correspondence
- avoid including one obviously "safe" role that the clue system will struggle to use as a suspect
- if you reuse a world person, sharpen them into a suspect-ready character rather than copying their summary mechanically
- do not create a playable suspect who is also left behind as a duplicate background person entry
- make the cast feel varied, dramatic, and fun to roleplay
- avoid bland job-title-only archetypes or repetitive bios
`.trim()
  };
}
