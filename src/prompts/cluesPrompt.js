export function buildCluesPrompt({ storyBlurb, characters, locations, narratives, totalClues, numPlayers }) {
  const suspectNames = characters.map(c => c.card_title).join(', ');
  const varietyDeckNote
    = totalClues >= 3
      ? 'include at least one artifact, one fact, and one derived in the full set; alternate types so the same kind does not dominate consecutively.'
      : 'use distinct clue_types where the card count allows; still avoid consecutive duplicates.';
  return {
    system: `
You are generating all ${totalClues} clue cards for a murder mystery game with ${numPlayers} players.

Think comprehensively — these are every clue card in the game.

Clue shape (every card):
- Short: card_title is a terse label; card_contents is 1–3 tight sentences (or one crisp line of artifact text like a timestamp or line from a list). Nothing essay-length.
- Information-first: state what players learn — who/what/when/where — not GM narration or theory.
- One unit per card: one item, datum, or implication chain stop. Do not bundle multiple unrelated findings.
- Not puzzle evidence: no full documents, walkthroughs, ASCII maps, or puzzle-bulk text. Clues stay playable at a glance.

clue_type — choose one string below for each card. Variety: ${varietyDeckNote}
- artifact: text meant to look like a fragment (label, receipt line, log snippet, scrap of note) with minimal framing.
- fact: a plain factual statement witnesses or records would support (observable, not "therefore the killer").
- derived: a single inference that still reads as data ("X was seen leaving before Y arrived"), not a verdict on whodunnit.

Together the deck should reward deduction: players combine cards; no card should single-handedly solve the mystery.

Distribute clues more/less evenly across suspects.
Each suspect should appear in roughly equal numbers of cards.
Each suspect should appear in no more than 2 cards.
No suspect should receive two cards sharing the same clue_type.

- No duplicate facts
- Equal spread of clue_weight: low, mid, high
- suspect_name is the person most directly connected to the clue
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
