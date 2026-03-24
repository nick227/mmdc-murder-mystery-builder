export function buildGameCardsPrompt({ storyBlurb, trails, playerCount, narratives }) {
  return {
    system: [
      "You write social interaction cards for a murder mystery.",
      "Cards should create pressure, comparison, doubt, and discovery across competing narratives.",
      "Each game card must be assigned to an act — the act when it becomes playable.",
      "Act 1 cards open social dynamics. Act 2 cards create pressure. Act 3 cards force commitment."
    ].join(" "),
    user: `
Write ${Math.max(playerCount * 2, 8)} game cards.

Story blurb:
${storyBlurb}

Breadcrumbs:
${JSON.stringify(trails, null, 2)}

Suspect narratives (all are plausible — distribute cards across all three):
${JSON.stringify(narratives, null, 2)}

Act assignment rules:
- act 1 game cards: introductory social moves — introduce yourself, establish trust, ask about the night
- act 2 game cards: pressure and confrontation — challenge an alibi, reveal a contradiction, demand answers
- act 3 game cards: final moves — stake a position, make an accusation, force a denial or confession

Distribute roughly: 40% act 1, 35% act 2, 25% act 3.

Narrative coverage:
- some cards should target narrative A (${narratives?.a?.suspect})
- some cards should target narrative B (${narratives?.b?.suspect})
- some cards should target narrative C (${narratives?.c?.suspect})

Rules:
- every card must force interaction between at least two players
- each card must feel targeted and distinct — no two cards should prompt the same action
- avoid direct conclusions
- use contradiction, witness pressure, item comparison, timeline checking, or motive challenge
- every card must include an act field (1, 2, or 3)
`.trim()
  };
}
