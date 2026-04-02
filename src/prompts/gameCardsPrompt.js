/**
 * One LLM call = five cards for a single player character.
 */
export function buildGameCardsPromptForPlayer({
  storyBlurb = '',
  characterName,
  characterRole = '',
  characterBio = '',
  playerIndex = 0,
  playerCount = 4,
  rejectionReasons = []
}) {
  const name = String(characterName || '').trim();
  const roleLine = String(characterRole || '').trim();
  const bio = String(characterBio || '').trim();
  const premise = String(storyBlurb || '').trim();
  const rejectionBlock = Array.isArray(rejectionReasons) && rejectionReasons.length
    ? `\nFix these issues from the last full-deck pass:\n${rejectionReasons.map((reason) => `- ${reason}`).join('\n')}\n`
    : '';

  const premiseLine = premise ? `\nPremise: ${premise}` : '';

  return {
    system: [
      'You write five short character "action" cards for one player in a murder-mystery party.',
      'Cards spark live improvisation: performances, mini-challenges, sneaky beats, in-character habits, or funny social bits.',
      'Each card uses one of: performance, conversation, search, flavor, accusation, alibi, trade, revelation.',
      'Vary the five: mix theatrical, sneaky, characteristic-of-this-role, and humorous—do not repeat the same vibe.'
    ].join(' '),
    user: `
Player ${playerIndex + 1} of ${playerCount} — cards are ONLY for the person playing this character.

Character: ${name}${roleLine ? `\nRole: ${roleLine}` : ''}${bio ? `\nBio:\n${bio}` : ''}${premiseLine}

Write exactly 5 game cards for THIS character only.

Each card: game_card_type, card_title (short), card_contents, act (1, 2, or 3—use a natural mix).

game_card_type: favor performance and flavor for energy; mix in conversation, trade, alibi; use search, revelation, accusation lightly and keep them playful, not trial-like.

Rules:
- Personalize to ${name}; other guests may be named when it helps the beat.
- No wall-of-text; no "prove who did it"; five distinct premises.
${rejectionBlock}
`.trim()
  };
}
