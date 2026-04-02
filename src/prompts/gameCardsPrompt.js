/**
 * One LLM call = five cards for a single player character.
 * Prompt stays short: story + this character only; encourages live performance, not plot steering.
 */
export function buildGameCardsPromptForPlayer({
  storyBlurb,
  characterName,
  characterRole = '',
  characterBio = '',
  storyHint = '',
  playerIndex = 0,
  playerCount = 4,
  rejectionReasons = []
}) {
  const name = String(characterName || '').trim();
  const roleLine = String(characterRole || '').trim();
  const bio = String(characterBio || '').trim();
  const hint = String(storyHint || '').trim();
  const rejectionBlock = Array.isArray(rejectionReasons) && rejectionReasons.length
    ? `\nFix these issues from the last full-deck pass:\n${rejectionReasons.map((reason) => `- ${reason}`).join('\n')}\n`
    : '';

  const storyLine = String(storyBlurb || '').trim();
  const storyBlock = storyLine
    ? `Story (one paragraph; stay loosely in this world):\n${storyLine}\n`
    : '';

  return {
    system: [
      'You write five short "moment" cards for one player in a murder-mystery party.',
      'Cards spark live improvisation: performances, mini-challenges, sneaky beats, in-character habits, or funny social bits.',
      'They do not run the mystery or deliver solutions—keep clues and accusations light; prioritize playable theater.',
      'Second person, imperative. One clear beat per card.',
      'Each card uses one of: performance, conversation, search, flavor, accusation, alibi, trade, revelation.',
      'Vary the five: mix theatrical, sneaky, characteristic-of-this-role, and humorous—do not repeat the same vibe.'
    ].join(' '),
    user: `
Player ${playerIndex + 1} of ${playerCount} — cards are ONLY for the person playing this character.

Character: ${name}${roleLine ? `\nRole: ${roleLine}` : ''}${bio ? `\nBio:\n${bio}` : ''}${hint ? `\nAngle from story material:\n${hint}` : ''}

${storyBlock}
Write exactly 5 game cards for THIS character only.

Act mix (strict): exactly 2 cards with act 1, exactly 1 card with act 2, exactly 2 cards with act 3.

game_card_type hints (pick a mixed set; not five of the same):
- performance, flavor: strong choices for acting bits and room energy
- conversation, trade, alibi: social pressure without solving the case
- search, revelation, accusation: use sparingly and keep silly or theatrical, not trial-by jury

Every card needs: game_card_type, card_title (short), card_contents, act.

Rules:
- Personalize to ${name}'s voice, role, and bio—other guests may be named when it helps the beat.
- No long backstory; no "you prove who did it"; no numbered multi-step homework lists.
- Five distinct premises—no duplicate gimmicks.
${rejectionBlock}
`.trim()
  };
}
