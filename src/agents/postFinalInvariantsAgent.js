import { getCardsByType, getCharacterCards } from '../utils/cards.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasPlaceholder(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'derived_later' || normalized.includes('to be derived');
}

export async function postFinalInvariantsAgent(context) {
  const playerCount = context.playerCount ?? 4;
  const characterCount = getCharacterCards(context.cards).length;
  assert(
    characterCount === playerCount,
    `post_final_invariants_agent: character count ${characterCount} != playerCount ${playerCount}`
  );

  const secrets = getCardsByType(context.cards, 'secret');
  assert(
    secrets.length >= characterCount * 2,
    `post_final_invariants_agent: expected at least ${characterCount * 2} secret cards; got ${secrets.length}`
  );

  const hostSpeech = getCardsByType(context.cards, 'host_speech');
  assert(
    hostSpeech.length >= 3,
    `post_final_invariants_agent: expected at least 3 host_speech cards; got ${hostSpeech.length}`
  );

  const treasureItems = getCardsByType(context.cards, 'item').filter((c) => c.is_treasure === true);
  assert(
    treasureItems.length === 1,
    `post_final_invariants_agent: expected exactly one is_treasure item; got ${treasureItems.length}`
  );

  for (const card of context.cards || []) {
    assert(!hasPlaceholder(card.difficulty), `post_final_invariants_agent: placeholder difficulty on card ${card.card_id}`);

    if (Array.isArray(card.required_card_refs) && card.required_card_refs.length > 0) {
      assert(
        Array.isArray(card.required_card_ids) && card.required_card_ids.length >= card.required_card_refs.length,
        `post_final_invariants_agent: unresolved required refs on card ${card.card_id}`
      );
    }

    if (Array.isArray(card.unlock_card_refs)) {
      assert(
        Array.isArray(card.unlock_card_ids) && card.unlock_card_ids.length >= card.unlock_card_refs.length,
        `post_final_invariants_agent: unresolved unlock refs on card ${card.card_id}`
      );
    }
  }

  for (const bundle of context.puzzle_bundles || []) {
    assert(!hasPlaceholder(bundle.difficulty), `post_final_invariants_agent: placeholder bundle difficulty on ${bundle.bundle_id}`);
  }

  return context;
}

