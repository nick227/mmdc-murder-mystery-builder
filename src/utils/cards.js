export function pushCards(context, type, entries) {
  if (!context.cards) context.cards = [];

  const normalized = entries.map((e) => {
    const card = {
      card_type: type,
      card_title: e.card_title.trim(),
      card_contents: e.card_contents.trim()
    };
    // Preserve act assignment if present
    if (e.act !== undefined) card.act = e.act;
    return card;
  });

  context.cards.push(...normalized);
  return context;
}
