function formatCoreTruthForClues(coreTruth) {
  const m = coreTruth?.murder;
  const t = coreTruth?.treasure;
  if (!m || !t) {
    return '(core truth not available)';
  }
  return JSON.stringify(
    {
      murder: {
        killer: m.killer,
        victim: m.victim,
        location: m.location,
        murder_solution: m.murder_solution
      },
      treasure: {
        object: t.object,
        hiding_place: t.hiding_place,
        treasure_solution: t.treasure_solution
      }
    },
    null,
    2
  );
}

export function buildCluesPrompt({
  storyBlurb,
  characters,
  locations,
  narratives,
  totalClues,
  numPlayers,
  coreTruth
}) {
  const suspectNames = (characters || []).map((c) => c.card_title).join(', ');
  return {
    system: `
You are generating all ${totalClues} clue cards for a murder mystery game with ${numPlayers} players.

Think comprehensively — these are every clue card in the game.

Hidden canonical solution (author use only):
- Every clue must be consistent with this truth when it touches facts, people, places, or objects.
- Do not put the full solution on a single card; players deduce from many small pieces.

One clue alone must NOT solve the murder or fully reveal the treasure location.

`.trim(),
    user: `
Create ${totalClues} clue cards for a murder mystery game with ${numPlayers} players.

Story:
${storyBlurb}

Hidden solution (ground truth for clue writing — do not dump this verbatim onto one card):
${formatCoreTruthForClues(coreTruth)}

Suspects:
${suspectNames}

Locations:
${JSON.stringify(locations || [], null, 2)}

Narratives:
${JSON.stringify(narratives || [], null, 2)}

Generate exactly ${totalClues} clue cards.

Shape + variety:
- Mix artifact, fact, and derived across the set (avoid homogeneity).
- Stay small and information-first; do not drift into long puzzle-style evidence.

Balancing:
- Each suspect should appear in no more than 2 cards
- No suspect should receive two cards sharing the same clue_type

Return exactly:
card_title, card_contents, clue_type, suspect_name, clue_weight
(clue_type must be exactly artifact, fact, or derived)

`.trim()
  };
}
