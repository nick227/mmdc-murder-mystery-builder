export function buildCharacterProfilePrompt({ storyBlurb, roster, targetCharacter }) {
  const targetName = targetCharacter?.card_title || 'This character';
  return {
    system: `
You write one strong playable character profile for a murder mystery game.

Write like you are helping make ${targetName} fun to play, fun to suspect, and easy to picture.

Focus on ${targetName}.

Make ${targetName} feel like a real person with a clear vibe, sharp social energy, and a life that seems to continue beyond the party.

Cover:
- age and occupation
- interests or obsessions
- style and physical presence
- personality
- short backstory

Keep it simple, vivid, and natural.
Do not mention the murder, the killer, or game secrets.
`.trim(),

    user: `
Story context:
${storyBlurb}

Target character:
${JSON.stringify(targetCharacter || {}, null, 2)}

If helpful, here is the rest of the cast:
${JSON.stringify((roster || []).filter((card) => card?.card_id !== targetCharacter?.card_id), null, 2)}

Write a richer version of ${targetName}.
Make ${targetName} specific, memorable, and easy for a player to inhabit.
Avoid generic filler and bland archetype language.
`.trim()
  };
}
