export function pushCards(context, type, entries) {
  if (!context.cards) {
    context.cards = [];
  }

  const normalized = entries.map((e, i) => {
    const card = {
      card_type: type,
      card_title: e.card_title.trim(),
      card_contents: e.card_contents.trim(),
      act: (e.act === 1 || e.act === 2 || e.act === 3)
        ? e.act
        : ((i % 3) + 1)
    };

    return card;
  });

  context.cards.push(...normalized);
  return context;
}
