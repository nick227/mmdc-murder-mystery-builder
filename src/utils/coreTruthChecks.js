import { getCharacterCards } from './cards.js';

/** First segment before comma, trimmed — matches playable roster naming. */
export function baseName(value) {
  return String(value || '').split(',')[0].trim();
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

export function validateKillerPlayable(coreTruth, context, playableCharacters = getPlayableCharacters(context)) {
  const killerName = baseName(coreTruth?.murder?.killer);
  if (!killerName) {
    return 'killer_not_playable: killer is missing';
  }
  if (!playableCharacters.some((c) => c.name === killerName)) {
    return 'killer_not_playable: killer must match a playable character name exactly';
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
