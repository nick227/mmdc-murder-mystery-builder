import { getCharacterCards } from './cards.js';

/** First segment before comma, trimmed — matches playable roster naming. */
export function baseName(value) {
  return String(value || '').split(',')[0].trim();
}

/** Segment before " - " role suffix (after comma trim). Clues often use short names; cards use "Name - The Archetype". */
export function suspectRosterKey(value) {
  const comma = baseName(value);
  const head = comma.split(/\s+-\s+/)[0];
  return (head || comma).trim();
}

export function getPlayableCharacters(context) {
  return getCharacterCards(context.cards || []).map((card) => ({
    card_id: String(card?.card_id || '').trim(),
    name: baseName(card?.card_title),
    title: String(card?.card_title || '').trim(),
    contents: String(card?.card_contents || '').trim()
  }));
}

export function validateVictimType(coreTruth, context, playableCharacters = getPlayableCharacters(context)) {
  const victim = baseName(coreTruth?.murder?.victim);
  if (!victim) {
    return 'invalid_victim_type: victim must be an explicitly named person';
  }
  if (playableCharacters.some((character) => character.name === victim)) {
    return `invalid_victim_type: victim "${victim}" is a playable suspect`;
  }
  const reservedVictimName = baseName(context?.reservedVictim?.name);
  if (reservedVictimName && reservedVictimName !== victim) {
    return `invalid_victim_type: victim "${victim}" does not match reserved victim "${reservedVictimName}"`;
  }
  return null;
}

/**
 * Killer string may be full card_title or a short display name ("Name - Role" → "Name").
 * Playable roster uses card_title; LLMs often emit only the name part.
 */
export function killerMatchesPlayableRoster(killerRaw, playableCharacters) {
  const k = String(killerRaw || '').trim();
  if (!k) {
    return false;
  }
  const kRoster = suspectRosterKey(k);
  return playableCharacters.some((c) => {
    const t = String(c.title || '').trim();
    if (!t) {
      return false;
    }
    if (t === k) {
      return true;
    }
    if (baseName(t) === baseName(k) && baseName(k)) {
      return true;
    }
    return kRoster && suspectRosterKey(t) === kRoster;
  });
}

export function validateKillerPlayable(coreTruth, context, playableCharacters = getPlayableCharacters(context)) {
  const killerRaw = String(coreTruth?.murder?.killer || '').trim();
  if (!killerRaw) {
    return 'killer_not_playable: killer is missing';
  }
  if (!killerMatchesPlayableRoster(killerRaw, playableCharacters)) {
    return 'killer_not_playable: killer must match a playable character (full card_title or same identity as one suspect)';
  }
  return null;
}

export function collectCoreTruthDeterministicIssues(coreTruth, context) {
  const playableCharacters = getPlayableCharacters(context);
  return [
    validateVictimType(coreTruth, context, playableCharacters),
    validateKillerPlayable(coreTruth, context, playableCharacters)
  ].filter(Boolean);
}
