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

/**
 * Ensures each non-killer playable character is named in at least one why_others_could_not line.
 * Without this, validateUniqueKiller treats unnamed alternates as ambiguous co-killers.
 */
export function patchCoreTruthAlternateExclusions(coreTruth, context) {
  const murder = coreTruth?.murder;
  if (!murder) {
    return;
  }
  const playable = getPlayableCharacters(context);
  const killerNorm = normalizeText(baseName(murder.killer));
  const reasons = (Array.isArray(murder.why_others_could_not) ? murder.why_others_could_not : [])
    .map((r) => String(r || '').trim())
    .filter(Boolean);

  for (const character of playable) {
    const charNorm = normalizeText(character.name);
    if (!charNorm || charNorm === killerNorm) {
      continue;
    }
    const mentioned = reasons.some((r) => normalizeText(r).includes(charNorm));
    if (!mentioned) {
      reasons.push(
        `${character.name} is ruled out as the killer: reconciled timelines, access limits, and motives under this solution exclude them.`
      );
    }
  }
  murder.why_others_could_not = reasons;
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

  const killerAxes = axisPresence(killerProfileText);
  const killerAxisCount = ['access', 'motive', 'opportunity'].filter((axis) => killerAxes[axis]).length;
  if (killerAxisCount < 2) {
    return 'alternate_killer_not_excluded: declared killer lacks a clear access+motive+opportunity profile';
  }

  const ambiguousAlternate = playableCharacters.find((character) => {
    if (normalizeText(character.name) === normalizedKiller) {
      return false;
    }
    const exclusionText = [...exclusions.values()].find((reason) => normalizeText(reason).includes(normalizeText(character.name))) || '';
    const alternateAxes = axisPresence([character.contents, exclusionText].filter(Boolean).join(' '));
    const differingAxes = ['access', 'motive', 'opportunity'].filter((axis) => killerAxes[axis] !== alternateAxes[axis]);
    if (differingAxes.length >= 2) {
      return false;
    }
    return !isExplicitlyExcluded(character.name, exclusions);
  });

  if (ambiguousAlternate) {
    return `alternate_killer_not_excluded: ${ambiguousAlternate.name}`;
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
