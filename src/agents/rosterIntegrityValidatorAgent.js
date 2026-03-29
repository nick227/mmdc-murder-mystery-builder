import { getCardsByType, getCharacterCards } from '../utils/cards.js';

const HONORIFICS = new Set([
  'Lady',
  'Lord',
  'Master',
  'Mistress',
  'Sir',
  'Dame'
]);

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function stripLeadingHonorific(name) {
  const tokens = normalizeName(name).split(' ').filter(Boolean);
  if (tokens.length >= 2 && HONORIFICS.has(tokens[0])) {
    return tokens.slice(1).join(' ');
  }
  return normalizeName(name);
}

function getBaseCharacterName(title) {
  const normalized = normalizeName(title);
  if (!normalized) {
    return '';
  }

  const beforeComma = normalized.split(',')[0]?.trim();
  return beforeComma || normalized;
}

function getCharacterAliases(title) {
  const normalizedTitle = normalizeName(title);
  const normalized = getBaseCharacterName(title);
  if (!normalized) {
    return [];
  }

  const aliases = new Set([normalized]);
  const tokens = normalized.split(' ').filter(Boolean);
  const commaParts = normalizedTitle.split(',').map((part) => part.trim()).filter(Boolean);
  const honorificStripped = stripLeadingHonorific(normalized);
  const honorificTokens = honorificStripped.split(' ').filter(Boolean);
  if (tokens.length >= 2) {
    aliases.add(tokens.slice(0, 2).join(' '));
  }
  if (tokens.length >= 3) {
    aliases.add(tokens.slice(0, 3).join(' '));
  }
  for (const token of tokens) {
    if (token.length >= 5) {
      aliases.add(token);
    }
  }
  if (commaParts.length >= 2) {
    aliases.add(commaParts[1]);
    if (commaParts[1].startsWith('The ')) {
      aliases.add(commaParts[1].slice(4));
    }
  }
  if (honorificStripped && honorificStripped !== normalized) {
    aliases.add(honorificStripped);
  }
  if (honorificTokens.length >= 2) {
    aliases.add(honorificTokens.slice(0, 2).join(' '));
    aliases.add(honorificTokens.slice(-2).join(' '));
  }

  return [...aliases];
}

function getLocationAliases(title) {
  const normalized = normalizeName(title);
  if (!normalized) {
    return [];
  }

  const aliases = new Set([normalized]);
  const withoutArticle = normalized.startsWith('The ') ? normalized.slice(4) : normalized;
  if (normalized.startsWith('The ')) {
    aliases.add(withoutArticle);
  }
  const dehyphenated = withoutArticle.replace(/-/g, ' ');
  if (dehyphenated !== withoutArticle) {
    aliases.add(dehyphenated);
  }
  const tokens = dehyphenated.split(' ').filter(Boolean);
  for (let size = 2; size <= Math.min(3, tokens.length); size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      aliases.add(tokens.slice(index, index + size).join(' '));
    }
  }
  return [...aliases];
}

function getEntityAliases(title) {
  const normalized = normalizeName(title);
  if (!normalized) {
    return [];
  }

  const aliases = new Set([normalized]);
  const tokens = normalized.split(' ').filter(Boolean);
  const honorificStripped = stripLeadingHonorific(normalized);
  const honorificTokens = honorificStripped.split(' ').filter(Boolean);
  if (tokens.length >= 2) {
    aliases.add(tokens.slice(0, 2).join(' '));
    aliases.add(tokens.slice(-2).join(' '));
  }
  for (const token of tokens) {
    if (token.length >= 5) {
      aliases.add(token);
    }
  }
  if (honorificStripped && honorificStripped !== normalized) {
    aliases.add(honorificStripped);
  }
  if (honorificTokens.length >= 2) {
    aliases.add(honorificTokens.slice(0, 2).join(' '));
    aliases.add(honorificTokens.slice(-2).join(' '));
  }
  return [...aliases];
}

function extractCapitalizedPhrases(text) {
  const str = String(text || '');
  const out = [];
  const leadingNoisePattern = /^\s*(Though|Among|While|Because|After|Before|When|If|Since|During)\s+/;

  for (const line of str.split(/\r?\n/g)) {
    const cleanedLine = line.replace(leadingNoisePattern, '');
    const multiWordMatches = cleanedLine.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}\b/g) || [];
    for (const match of multiWordMatches) {
      out.push(normalizeName(match));
    }

    const appositiveMatches = [...cleanedLine.matchAll(/\b([A-Z][a-z]+), the [A-Z][a-z]+(?: [A-Z][a-z]+){0,2}\b/g)];
    for (const match of appositiveMatches) {
      out.push(normalizeName(match[1]));
    }
  }

  return out.filter(Boolean);
}

function extractAllowedWorldPhrases(text) {
  const str = String(text || '');
  const matches = str.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}\b/g) || [];
  return matches.map((match) => normalizeName(match)).filter(Boolean);
}

function isImperativeGamePhrase(phrase) {
  const imperativeStarts = new Set([
    'Address',
    'Ask',
    'Bring',
    'Challenge',
    'Confront',
    'Demand',
    'Discuss',
    'Encourage',
    'Engage',
    'Force',
    'Invite',
    'Mention',
    'Note',
    'Present',
    'Press',
    'Push',
    'Recall',
    'Require',
    'Reveal',
    'Question',
    'Directly'
  ]);
  const discoursePhrases = new Set(['Meanwhile', 'However', 'Instead']);

  const normalized = normalizeName(phrase);
  const firstWord = normalized.split(' ')[0];
  if (discoursePhrases.has(normalized)) {
    return true;
  }
  if (firstWord === 'When') {
    return true;
  }
  return imperativeStarts.has(firstWord);
}

function isWorldOrRolePhrase(phrase) {
  const normalized = normalizeName(phrase);
  const tokens = normalized.split(' ');

  const blockedTokens = new Set([
    'Alcove',
    'Arcana',
    'Archivist',
    'Books',
    'Combination',
    'Comparison',
    'Compendium',
    'Correlation',
    'Curator',
    'Display',
    'Elimination',
    'Instructions',
    'Library',
    'Location',
    'Manuscripts',
    'Murder',
    'Ownership',
    'Puzzle',
    'Physical',
    'Rare',
    'Reference',
    'Solution',
    'Specialist',
    'Stacks',
    'Timeline',
    'Texts',
    'Verification',
    'Confirmation',
    'Constraints',
    'Link',
    'Movement'
  ]);

  const blockedPhrases = new Set([
    'Who Used',
    'Secret Passage',
    'Combining Access'
  ]);

  if (blockedPhrases.has(normalized)) {
    return true;
  }

  if (tokens[0] === 'The') {
    return true;
  }

  if (tokens[0] === 'House') {
    return true;
  }

  return tokens.some((token) => blockedTokens.has(token));
}

export async function rosterIntegrityValidatorAgent(context) {
  const roster = getCharacterCards(context.cards);
  const rosterNames = roster.map((c) => normalizeName(c?.card_title)).filter(Boolean);
  if (!rosterNames.length) {
    return context;
  }

  const locationCards = getCardsByType(context.cards, 'location');
  const locationNames = locationCards.map((c) => normalizeName(c?.card_title)).filter(Boolean);
  const personCards = getCardsByType(context.cards, 'person');
  const personNames = personCards.map((c) => normalizeName(c?.card_title)).filter(Boolean);
  const foundationCards = (Array.isArray(context.cards) ? context.cards : []).filter((card) =>
    ['person', 'location'].includes(card?.card_type)
  );
  const worldPeople = (Array.isArray(context?.worldEntities?.people) ? context.worldEntities.people : [])
    .map((entry) => normalizeName(entry?.name))
    .filter(Boolean);
  const worldLocations = (Array.isArray(context?.worldEntities?.locations) ? context.worldEntities.locations : [])
    .map((entry) => normalizeName(entry?.name))
    .filter(Boolean);
  const storyWorldPhrases = [
    ...extractAllowedWorldPhrases(context?.storyBlurb),
    ...extractAllowedWorldPhrases(context?.world),
    ...foundationCards.flatMap((card) => extractAllowedWorldPhrases(card?.card_contents))
  ];

  const allowed = new Set();
  for (const name of rosterNames) {
    allowed.add(name);
    for (const alias of getCharacterAliases(name)) {
      allowed.add(alias);
    }
  }

  for (const name of locationNames) {
    for (const alias of getLocationAliases(name)) {
      allowed.add(alias);
    }
  }

  for (const name of [...personNames, ...worldPeople, ...worldLocations, ...storyWorldPhrases]) {
    for (const alias of getEntityAliases(name)) {
      allowed.add(alias);
    }
  }

  const unknownPhrases = new Set();

  for (const card of Array.isArray(context.cards) ? context.cards : []) {
    const text = String(card?.card_contents || '');
    for (const phrase of extractCapitalizedPhrases(text)) {
      if (allowed.has(phrase)) {
        continue;
      }
      if (isImperativeGamePhrase(phrase)) {
        continue;
      }
      if (isWorldOrRolePhrase(phrase)) {
        continue;
      }
      unknownPhrases.add(phrase);
    }
  }

  if (!unknownPhrases.size) {
    return context;
  }

  context.debug.warning_log.push({
    stage: 'roster_integrity',
    reason: 'unknown_capitalized_phrases',
    unknown_phrases: [...unknownPhrases]
  });

  return context;
}
