import { getCharacterCards } from './cards.js';

const NON_PERSON_VICTIM_PATTERNS = /\b(statue|bust|portrait|effigy|idol|artifact|relic|object|prop|quill|folio|ring|locket|mask|scroll|jewel|ruby)\b/i;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Killer tokens must appear in order within the playable name tokens (handles nicknames in the middle). */
function tokenSubsequenceMatch(needleTokens, haystackTokens) {
  let i = 0;
  for (const t of needleTokens) {
    while (i < haystackTokens.length && haystackTokens[i] !== t) {
      i += 1;
    }
    if (i >= haystackTokens.length) {
      return false;
    }
    i += 1;
  }
  return true;
}

/**
 * Map a model-supplied killer string onto canonical playable `baseName(card_title)` when the string is a
 * clear variant (shortened name, missing middle nicknames). Returns null if ambiguous or unmatched.
 */
export function resolveKillerToPlayableName(rawKiller, playableCharacters) {
  const list = Array.isArray(playableCharacters) ? playableCharacters : [];
  if (!list.length) {
    return null;
  }

  const killerBase = baseName(rawKiller);
  const normalizedKiller = normalizeText(killerBase);
  const killerTokens = normalizedKiller.split(' ').filter(Boolean);
  if (!killerTokens.length) {
    return null;
  }

  const exact = list.find((c) => normalizeText(c.name) === normalizedKiller);
  if (exact) {
    return exact.name;
  }

  const subsequenceMatches = list.filter((c) => {
    const charTokens = normalizeText(c.name).split(' ').filter(Boolean);
    return tokenSubsequenceMatch(killerTokens, charTokens);
  });
  if (subsequenceMatches.length === 1) {
    return subsequenceMatches[0].name;
  }

  const forwardContains = list.filter((c) => {
    const nc = normalizeText(c.name);
    return nc.includes(normalizedKiller) && normalizedKiller.length >= 5;
  });
  if (forwardContains.length === 1) {
    return forwardContains[0].name;
  }

  const reverseContains = list.filter((c) => {
    const nc = normalizeText(c.name);
    return normalizedKiller.includes(nc) && nc.length >= 5;
  });
  if (reverseContains.length === 1) {
    return reverseContains[0].name;
  }

  return null;
}

function baseName(value) {
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

function getKnownPeople(context) {
  return new Set(
    []
      .concat(Array.isArray(context?.storyEntities?.people) ? context.storyEntities.people : [])
      .concat(Array.isArray(context?.worldEntities?.people) ? context.worldEntities.people : [])
      .concat((context?.cards || []).filter((card) => card?.card_type === 'person').map((card) => ({ name: card?.card_title })))
      .map((entry) => baseName(entry?.name))
      .filter(Boolean)
      .map((name) => normalizeText(name))
  );
}

/** Text sources where a victim may appear without being in structured people lists. */
function buildCanonTextForVictimCheck(context) {
  const chunks = [];
  if (typeof context?.world === 'string') {
    chunks.push(context.world);
  }
  if (typeof context?.storyBlurb === 'string') {
    chunks.push(context.storyBlurb);
  }
  if (typeof context?.story_description === 'string') {
    chunks.push(context.story_description);
  }
  if (typeof context?.story_title === 'string') {
    chunks.push(context.story_title);
  }
  for (const entry of [...(context?.worldEntities?.people || []), ...(context?.storyEntities?.people || [])]) {
    if (entry?.name) {
      chunks.push(String(entry.name));
    }
    if (entry?.summary) {
      chunks.push(String(entry.summary));
    }
  }
  for (const card of context?.cards || []) {
    if (card?.card_type === 'person') {
      chunks.push(String(card.card_title || ''));
      chunks.push(String(card.card_contents || ''));
    }
  }
  return normalizeText(chunks.filter(Boolean).join(' '));
}

function victimNamedInCanon(context, normalizedVictim) {
  if (!normalizedVictim || normalizedVictim.length < 3) {
    return false;
  }
  const corpus = buildCanonTextForVictimCheck(context);
  return Boolean(corpus && corpus.includes(normalizedVictim));
}

export function validateVictimType(coreTruth, context, playableCharacters = getPlayableCharacters(context)) {
  const victim = baseName(coreTruth?.murder?.victim);
  const normalizedVictim = normalizeText(victim);
  if (!victim) {
    return 'invalid_victim_type: victim must be an explicitly named person';
  }
  if (NON_PERSON_VICTIM_PATTERNS.test(victim)) {
    return `invalid_victim_type: victim "${victim}" is an object/prop, not a person`;
  }
  if (playableCharacters.some((character) => normalizeText(character.name) === normalizedVictim)) {
    return `invalid_victim_type: victim "${victim}" is a playable suspect`;
  }
  const reservedVictimName = baseName(context?.reservedVictim?.name);
  if (reservedVictimName && normalizeText(reservedVictimName) !== normalizedVictim) {
    return `invalid_victim_type: victim "${victim}" does not match reserved victim "${reservedVictimName}"`;
  }
  const knownPeople = getKnownPeople(context);
  if (knownPeople.size && !knownPeople.has(normalizedVictim) && !victimNamedInCanon(context, normalizedVictim)) {
    return `invalid_victim_type: victim "${victim}" is not recognized as a world/story person`;
  }
  return null;
}

export function validateKillerPlayable(coreTruth, context, playableCharacters = getPlayableCharacters(context)) {
  const killerName = baseName(coreTruth?.murder?.killer);
  const normalizedKiller = normalizeText(killerName);
  if (!killerName) {
    return 'killer_not_playable: killer is missing';
  }
  const match = playableCharacters.find((c) => normalizeText(c.name) === normalizedKiller);
  if (!match) {
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
