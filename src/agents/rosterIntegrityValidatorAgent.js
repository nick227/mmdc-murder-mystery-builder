import { getCharacterCards } from '../utils/cards.js';

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function extractCapitalizedPhrases(text) {
  // Minimal MVP: find multi-word capitalized phrases that *look like names*.
  // Examples: "Lady Morgana", "Frank Malone", "Detective Clara"
  const str = String(text || '');
  const out = [];
  for (const line of str.split(/\r?\n/g)) {
    const matches = line.match(/\b[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}\b/g) || [];
    for (const m of matches) {
      out.push(normalizeName(m));
    }
  }
  return out.filter(Boolean);
}

export async function rosterIntegrityValidatorAgent(context) {
  const roster = getCharacterCards(context.cards);
  const rosterNames = roster.map((c) => normalizeName(c?.card_title)).filter(Boolean);
  if (!rosterNames.length) {
    return context;
  }

  const allowed = new Set(rosterNames);
  const unknownPhrases = new Set();

  const stopPhrases = new Set([
    'The Ash Pit',
    'The Black Ember',
    'The Velvet Ember'
  ]);

  for (const card of Array.isArray(context.cards) ? context.cards : []) {
    const text = String(card?.card_contents || '');
    for (const phrase of extractCapitalizedPhrases(text)) {
      if (stopPhrases.has(phrase)) {
        continue;
      }
      if (!allowed.has(phrase)) {
        unknownPhrases.add(phrase);
      }
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

