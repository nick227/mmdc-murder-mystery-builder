import { getCharacterCards } from './cards.js';

const NON_PERSON_VICTIM_PATTERNS = /\b(statue|bust|portrait|effigy|idol|artifact|relic|object|prop|quill|folio|ring|locket|mask|scroll|jewel|ruby)\b/i;
const ACCESS_PATTERNS = /\b(access|key|route|passage|entry|door|gate|private|restricted|alcove|study|library|pavilion|garden|room|grounds)\b/i;
const MOTIVE_PATTERNS = /\b(jealous|envy|revenge|debt|blackmail|inheritance|ambition|fear|legacy|silence|rival|motive|power|fortune|reputation)\b/i;
const OPPORTUNITY_PATTERNS = /\b(opportunity|alone|unseen|moment|window|opening|while|during|before|after|near|present|whereabouts|absent|slipped away)\b/i;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseName(value) {
  return String(value || '').split(',')[0].trim();
}

function hasPattern(text, pattern) {
  return pattern.test(String(text || ''));
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

function buildExclusionMap(coreTruth) {
  const map = new Map();
  for (const reason of Array.isArray(coreTruth?.murder?.why_others_could_not) ? coreTruth.murder.why_others_could_not : []) {
    const text = String(reason || '').trim();
    const normalized = normalizeText(text);
    if (!normalized) {
      continue;
    }
    map.set(normalized, text);
  }
  return map;
}

function isExplicitlyExcluded(name, exclusionReasons) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    return false;
  }
  for (const [normalizedReason] of exclusionReasons.entries()) {
    if (normalizedReason.includes(normalizedName)) {
      return true;
    }
  }
  return false;
}

function hasAccessMotiveOpportunityProfile(textBlob) {
  const text = String(textBlob || '');
  return hasPattern(text, ACCESS_PATTERNS)
    && hasPattern(text, MOTIVE_PATTERNS)
    && hasPattern(text, OPPORTUNITY_PATTERNS);
}

function axisPresence(textBlob) {
  const text = String(textBlob || '');
  return {
    access: hasPattern(text, ACCESS_PATTERNS),
    motive: hasPattern(text, MOTIVE_PATTERNS),
    opportunity: hasPattern(text, OPPORTUNITY_PATTERNS)
  };
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
  if (knownPeople.size && !knownPeople.has(normalizedVictim)) {
    return `invalid_victim_type: victim "${victim}" is not recognized as a world/story person`;
  }
  return null;
}

export function validateUniqueKiller(coreTruth, context, playableCharacters = getPlayableCharacters(context)) {
  const killerName = baseName(coreTruth?.murder?.killer);
  const normalizedKiller = normalizeText(killerName);
  const exclusions = buildExclusionMap(coreTruth);
  const declaredKiller = playableCharacters.find((character) => normalizeText(character.name) === normalizedKiller);
  if (!declaredKiller) {
    return 'alternate_killer_not_excluded: declared killer is not a playable character';
  }

  const killerProfileText = [
    declaredKiller.contents,
    coreTruth?.murder?.summary,
    coreTruth?.murder?.opportunity,
    coreTruth?.murder?.motive,
    coreTruth?.murder?.method
  ].join(' ');

  if (!hasAccessMotiveOpportunityProfile(killerProfileText)) {
    return 'alternate_killer_not_excluded: declared killer lacks a clear access+motive+opportunity profile';
  }
  const killerAxes = axisPresence(killerProfileText);

  const alternateKillers = playableCharacters.filter((character) => {
    if (normalizeText(character.name) === normalizedKiller) {
      return false;
    }
    if (isExplicitlyExcluded(character.name, exclusions)) {
      return false;
    }
    const alternateAxes = axisPresence(character.contents);
    const sharedAxes = ['access', 'motive', 'opportunity'].filter((axis) => killerAxes[axis] === true && alternateAxes[axis] === true);
    return sharedAxes.length >= 2;
  });

  if (alternateKillers.length) {
    return `alternate_killer_not_excluded: ${alternateKillers.map((character) => character.name).join(', ')}`;
  }

  return null;
}

export function collectCoreTruthDeterministicIssues(coreTruth, context) {
  const playableCharacters = getPlayableCharacters(context);
  return [
    validateVictimType(coreTruth, context, playableCharacters),
    validateUniqueKiller(coreTruth, context, playableCharacters)
  ].filter(Boolean);
}
