
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
- at least 1 puzzle must focus on murder opportunity, access, or movement
- at least 1 puzzle must focus on the missing fortune, hidden object, or concealment
- prefer elimination logic over vague suspicion
- do not write generic discussion prompts
- do not directly state the solution
- keep each puzzle focused and playable

REQUIRED puzzle types — include at least one of each:
1. ELIMINATION puzzle (Act 2): "Which suspect can be ruled out based on their alibi and physical impossibility?" — this should cleanly enable the ambitious/chef suspect to be eliminated.
2. OBJECT CHAIN puzzle (Act 2–3): "Trace the murder weapon from its origin to the victim — whose hands did it pass through?" — this should build toward the killer's physical chain.
3. TIMELINE CONTRADICTION puzzle (Act 3): "Which suspect's account of their location is directly contradicted by physical evidence?" — this should surface the killer's impossible alibi.
4. RED HERRING RESOLUTION puzzle (Act 3): "How does the reclusive suspect's presence near the crime scene relate to the hidden fortune rather than the murder?" — this should redirect suspicion away from the innocent reclusive suspect.

Act distribution:
- Act 2 puzzles: focus on elimination and alibi testing
- Act 3 puzzles: focus on object chain and timeline contradiction convergence

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
