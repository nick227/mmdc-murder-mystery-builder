import { getCardsByType, getCharacterCards } from '../utils/cards.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function postFinalInvariantsAgent(context) {
  const playerCount = context.playerCount ?? 4;
  const characterCount = getCharacterCards(context.cards).length;
  assert(
    characterCount === playerCount,
    `post_final_invariants_agent: character count ${characterCount} != playerCount ${playerCount}`
  );

  const secretCount = getCardsByType(context.cards, 'secret').length;
  assert(
    secretCount >= characterCount,
    `post_final_invariants_agent: secret count ${secretCount} < character count ${characterCount}`
  );

  return context;
}

