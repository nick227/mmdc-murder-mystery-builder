export function buildCluesPrompt({ storyBlurb, characters, locations, narratives, totalClues, numPlayers }) {
  const suspectNames = characters.map(c => c.card_title).join(', ');
  return {
    system: `
You are generating all ${totalClues} clue cards for a murder mystery game with ${numPlayers} players.

Think comprehensively — these are every clue card in the game.

Distribute clues more/less evenly across all suspects. 

Each suspect should appear in roughly equal numbers of cards.
Each suspect should appear in no more than 2 cards.
No suspect should receive two cards sharing the same clue_type.

- Each card is one observable fact, not a conclusion or deduction
- No duplicate facts
- Equal spread of clue_weight: low, mid, high
- Natural variety of clue_type
- Return the incriminated suspect's name.
`.trim(),
    user: `
Create ${totalClues} clue cards for a murder mystery game with ${numPlayers} players.

Story:
${storyBlurb}

Suspects: 
${suspectNames}

Locations:
${JSON.stringify(locations || [], null, 2)}

Narratives:
${JSON.stringify(narratives || [], null, 2)}

Generate exactly ${totalClues} clue cards.

Soft balancing guidance:
- Each suspect should appear in no more than 2 cards
- No suspect should receive two cards sharing the same clue_type

Return exactly:
card_title, card_contents, clue_type, suspect_name, clue_weight

`.trim()
  };
}
