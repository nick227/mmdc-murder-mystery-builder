import { getCharacterCards, getCardsByType } from './cards.js';

const WEAK_SINGLE_TOKENS = new Set(['lady', 'lord', 'miss', 'mrs', 'mr', 'sir', 'dr', 'the', 'a', 'an']);

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Phrases and distinctive tokens from playable character card titles. */
function playableSuspectPhrases(characterCards) {
  const phrases = [];
  for (const card of characterCards) {
    const main = String(card.card_title || '').split(',')[0].trim();
    const n = normalizeText(main);
    if (n.length >= 5) {
      phrases.push(n);
    }
    for (const w of n.split(/\s+/).filter(Boolean)) {
      if (w.length >= 5 || (w.length === 4 && !WEAK_SINGLE_TOKENS.has(w))) {
        phrases.push(w);
      }
    }
  }
  return [...new Set(phrases)];
}

function coreTruthBlob(coreTruth) {
  if (!coreTruth || typeof coreTruth !== 'object') {
    return '';
  }
  const m = coreTruth.murder || {};
  const t = coreTruth.treasure || {};
  return normalizeText(
    [
      m.killer,
      m.location,
      m.murder_solution,
      m.summary,
      m.method,
      m.opportunity,
      ...(Array.isArray(m.why_others_could_not) ? m.why_others_could_not : []),
      t.object,
      t.hiding_place,
      t.treasure_solution,
      t.concealment,
      t.discovery_path,
      t.significance
    ].join(' ')
  );
}

function characterContentsBlob(characterCards) {
  return normalizeText(characterCards.map((c) => c.card_contents || '').join(' '));
}

function rosterEntityTitles(cards) {
  const out = new Set();
  for (const type of ['location', 'item', 'person']) {
    for (const card of getCardsByType(cards, type)) {
      const title = normalizeText(card.card_title || '');
      if (title.length >= 4) {
        out.add(title);
      }
    }
  }
  return [...out];
}

/**
 * Target must reference a playable suspect, or a case object/location tied to the mystery
 * (core truth or character-relevant roster entity).
 */
export function isClueTargetAnchored(fact, context) {
  const f = normalizeText(fact);
  if (!f) {
    return false;
  }

  const characters = getCharacterCards(context.cards);
  for (const p of playableSuspectPhrases(characters)) {
    if (f.includes(p)) {
      return true;
    }
  }

  const killer = normalizeText(context.coreTruth?.murder?.killer || '');
  if (killer.length >= 5 && f.includes(killer)) {
    return true;
  }

  const blob = coreTruthBlob(context.coreTruth);
  for (const w of blob.split(/\s+/)) {
    if (w.length >= 4 && f.includes(w)) {
      return true;
    }
  }

  const m = context.coreTruth?.murder || {};
  const t = context.coreTruth?.treasure || {};
  for (const phrase of [m.location, m.method, t.object, t.hiding_place].map(normalizeText)) {
    if (phrase.length >= 6 && f.includes(phrase)) {
      return true;
    }
  }

  const charBlob = characterContentsBlob(characters);
  for (const title of rosterEntityTitles(context.cards)) {
    if (!f.includes(title)) {
      continue;
    }
    if (blob.includes(title) || charBlob.includes(title)) {
      return true;
    }
  }

  return false;
}
