export function buildCharacterProfilePrompt({ storyBlurb, roster, targetCharacter, cardCount = 3 }) {
  const targetName = targetCharacter?.card_title || 'This character';
  return {
    system: `
You create short character profile cards for a murder mystery game.

Each card is a specific fact, anecdote, or historical tidbit about ${targetName}.
Make the details vivid, grounded, and easy for a player to roleplay.
Avoid the murder, the killer, or game secrets.
`.trim(),

    user: `
Story context:
${storyBlurb}

Target character:
${JSON.stringify(targetCharacter || {}, null, 2)}

If helpful, here is the rest of the cast:
${JSON.stringify((roster || []).filter((card) => card?.card_id !== targetCharacter?.card_id), null, 2)}

Create ${cardCount} distinct profile cards for ${targetName}.
Each card must have:
- card_title: short, punchy label (3-7 words)
- card_contents: 1-3 sentences of concrete facts or historical tidbits
Make each card feel different (background, reputation, relationships, habits, career, scandal, etc).
Avoid generic filler and bland archetype language.
`.trim()
  };
}
