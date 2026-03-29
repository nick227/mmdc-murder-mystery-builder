function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const OBJECT_KEYWORDS = [
  'scroll', 'glove', 'scarf', 'quill', 'dagger', 'fabric', 'marks', 'floorboard', 'stone',
  'rope', 'letter', 'crown', 'folio', 'mask', 'cache', 'compartment', 'prop'
];

const PROPERTY_KEYWORDS = [
  'blood', 'bloody', 'torn', 'disturbed', 'broken', 'fresh', 'hidden', 'loose',
  'silk', 'velvet', 'stained', 'drag', 'ornate'
];

function toSlug(value) {
  return normalizeText(value).replace(/\s+/g, '_');
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findTimes(text) {
  const matches = [...String(text || '').matchAll(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi)];
  return matches.map((match) => {
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = String(match[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });
}

function detectLocation(text, cards = []) {
  const normalized = normalizeText(text);
  const locationCards = (Array.isArray(cards) ? cards : []).filter((card) => card?.card_type === 'location');

  for (const location of locationCards) {
    const title = String(location.card_title || '').trim();
    if (title && normalized.includes(normalizeText(title))) {
      return toSlug(title);
    }
  }

  return null;
}

function findReferencedSuspects(text, caseState) {
  const suspects = Array.isArray(caseState?.suspects) ? caseState.suspects : [];
  const normalized = normalizeText(text);
  return suspects.filter((suspect) =>
    normalized.includes(normalizeText(suspect.name))
    || normalized.includes(normalizeText(suspect.title))
  );
}

function buildFact({ card, statement, subject, index, time, location }) {
  return {
    fact_id: `${String(card?.card_id || 'card').trim()}_fact_${String(index + 1).padStart(3, '0')}`,
    subject,
    time,
    location,
    statement: String(statement || '').trim(),
    source_card_id: String(card?.card_id || '').trim() || null,
    source_card_ref: String(card?.card_ref || '').trim() || null
  };
}

function findKeyword(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.find((keyword) => normalized.includes(keyword)) || null;
}

function fallbackSignatureFragment(text) {
  const tokens = normalizeText(text)
    .split(' ')
    .filter((token) => token.length >= 4)
    .slice(0, 3);
  return tokens.join('_') || 'generic';
}

export function buildEvidenceSignature(card, context) {
  const title = String(card?.card_title || '').trim();
  const contents = String(card?.card_contents || '').trim();
  const text = `${title} ${contents}`.trim();
  if (!text) {
    return '';
  }

  const location = detectLocation(text, context?.cards) || 'unknown_location';
  const suspects = findReferencedSuspects(text, context?.case_state);
  const subject = suspects.length === 1 ? String(suspects[0].suspect_id || '').trim() : 'scene';
  const object = findKeyword(text, OBJECT_KEYWORDS) || fallbackSignatureFragment(title || contents);
  const property = findKeyword(text, PROPERTY_KEYWORDS) || 'plain';

  return [subject || 'scene', object, property, location].join('|');
}

export function canonicalizeEvidenceCard(card, context) {
  const text = `${String(card?.card_title || '').trim()} ${String(card?.card_contents || '').trim()}`.trim();
  if (!text) {
    return [];
  }

  const statements = splitSentences(String(card?.card_contents || '').trim());
  const facts = [];

  for (const statement of statements) {
    const location = detectLocation(statement, context?.cards) || detectLocation(text, context?.cards);
    const times = findTimes(statement);
    const suspects = findReferencedSuspects(statement, context?.case_state);

    if (suspects.length === 1) {
      facts.push(buildFact({
        card,
        statement,
        subject: suspects[0].suspect_id,
        index: facts.length,
        time: times[0] || null,
        location
      }));
      continue;
    }

    facts.push(buildFact({
      card,
      statement,
      subject: 'scene',
      index: facts.length,
      time: times[0] || null,
      location
    }));
  }

  return facts.length
    ? facts
    : [buildFact({
      card,
      statement: String(card?.card_contents || '').trim(),
      subject: 'scene',
      index: 0,
      time: findTimes(text)[0] || null,
      location: detectLocation(text, context?.cards)
    })];
}
