function formatMurderTruthForClues(coreTruth) {
  const m = coreTruth?.murder;
  if (!m) {
    return '(murder truth not available)';
  }
  return JSON.stringify(
    {
      killer: m.killer,
      victim: m.victim,
      location: m.location,
      murder_solution: m.murder_solution
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
You are generating all ${totalClues} clue cards for a murder mystery game.

Think comprehensively — these are the murder-investigation clue cards (not the separate treasure hunt).

One clue alone must NOT solve the murder.

First you must understand the game world and the story.

Then you must generate ${totalClues} clues that are relevant to the story and the murder truth below.

`.trim(),
    user: `
Create ${totalClues} clue cards for a murder mystery game with ${numPlayers} players.

Story:
${storyBlurb}

HIDDEN murder truth (NEVER REVEAL THESE TO THE PLAYERS):
${formatMurderTruthForClues(coreTruth)}

Suspects:
${suspectNames}

Locations:
${JSON.stringify(locations || [], null, 2)}

Narratives:
${JSON.stringify(narratives || [], null, 2)}

Generate exactly ${totalClues} clue cards.

Rules:
- Mix artifact, fact, and derived across the set (avoid homogeneity).
- Each suspect should appear in no more than 2 cards
- card_title, card_contents, clue_type, suspect_name, clue_weight
- (clue_type must be exactly artifact, fact, or derived)
- Do not make these clues about the treasure hunt or inheritance object; focus on the murder.

`.trim()
  };
}
