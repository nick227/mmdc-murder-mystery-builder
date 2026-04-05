/**
 * One LLM call = N cards for a single player character.
 */
export function buildGameCardsPromptForPlayer({
  storyBlurb = '',
  characterName,
  characterRole = '',
  characterBio = '',
  cardsPerPlayer = 5
}) {
  const name = String(characterName || '').trim();
  const roleLine = String(characterRole || '').trim();
  const bio = String(characterBio || '').trim();
  const n = Number.isFinite(Number(cardsPerPlayer)) ? Math.max(1, Math.floor(Number(cardsPerPlayer))) : 5;

  return {
    system: [
      `You write ${n} short character "action" cards for one player in a murder-mystery party.`,
      'Cards spark live improvisation: performances, mini-challenges, sneaky beats, in-character habits, or funny social bits.',
      'Vary the five: mix theatrical, sneaky, characteristic-of-this-role, and humorous—do not repeat the same vibe.'
    ].join(' '),
    user: `

Character: ${name}${roleLine ? `\n${roleLine}` : ''}${bio ? `\nBio:\n${bio}` : ''}

Story: ${storyBlurb}

Write exactly ${n} game cards for THIS character only.

Cards should encourage player interaction and performances.

Balance across:
- performances
- interactions
- sneaky tasks
- revealing moments
- social or physical challenges

Ideas inspiration:
  - Give a dramatic toast praising someone suspiciously
  - Win a bet against a party guest
  - Reveal a fake secret about yourself
  - Listen in on a conversation unnoticed
  - Inspect the last photo on everyone's phone
  - Challenge someone to a dance off
  - Ask someone to dance romantically
  - Steal something without them knowing
  - Tell the story about how you xyz...

  Cards drive the party action and story forward.

  Each card: card_title (short), card_contents.

`.trim()
  };
}
