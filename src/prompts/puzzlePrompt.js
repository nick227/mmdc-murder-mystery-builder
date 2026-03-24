
export function buildPuzzlePrompt({ storyBlurb, trails, narratives, puzzleCount }) {
  return {
    system: `
You design puzzle cards for a social deduction murder mystery.

Puzzles are deduction questions players can reasonably solve by combining evidence.
They must be sharp, specific, and comparison-driven.
A strong puzzle asks players to resolve:
- a contradiction
- a timeline conflict
- an access problem
- an ownership problem
- an elimination question

Do not write long explanatory essays.
Do not pre-solve the mystery.
`.trim(),

    user: `
Story:
${storyBlurb}

Trails:
${JSON.stringify(trails, null, 2)}

Narratives:
${JSON.stringify(narratives, null, 2)}

Create exactly ${puzzleCount} puzzle cards.

Requirements:
- every puzzle must ask a concrete deduction question
- every puzzle must compare at least 2 suspects, or compare a suspect against the evidence
- every puzzle must be answerable using evidence that could exist in clue or item cards
- at least 1 puzzle should focus on murder opportunity, access, or movement
- at least 1 puzzle should focus on the missing fortune, hidden object, or concealment
- prefer elimination logic over vague suspicion
- do not write generic discussion prompts
- do not directly state the solution
- keep each puzzle focused and playable

Each puzzle card must contain:
- card_title
- card_contents
- act (1, 2, or 3)

Good puzzle examples:
- Who could actually access the hidden area unseen?
- Whose timeline breaks if the witness statement is true?
- Which suspect fits the weapon chain and motive together?
- Which clue weakens the obvious suspect?

Return cards only.
`.trim()
  };
}
