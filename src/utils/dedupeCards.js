
// Strong dedupe by normalized title
export function dedupeCards(cards = []) {
  const seen = new Set();
  const out = [];

  for (const c of cards) {
    const key = (c.card_title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }

  return out;
}
