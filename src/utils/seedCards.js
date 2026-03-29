import { pushCards } from './cards.js';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function appendUniqueCards(context, entries) {
  const existing = new Set(
    (Array.isArray(context.cards) ? context.cards : [])
      .map((card) => `${normalizeKey(card.card_type)}::${normalizeKey(card.card_title)}`)
  );

  const unique = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    const key = `${normalizeKey(entry.card_type)}::${normalizeKey(entry.card_title)}`;
    if (!entry.card_title || !entry.card_contents || existing.has(key)) {
      continue;
    }
    existing.add(key);
    unique.push(entry);
  }

  if (!unique.length) {
    return context;
  }

  return pushCards(context, unique[0].card_type, unique);
}
