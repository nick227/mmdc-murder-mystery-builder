export function buildPlayerActivityPrompt({ storyBlurb, trails, playerCount, narratives }) {
  return {
    system: [
      'You create player activity cards that force interaction and move the mystery forward.',
      'Activities should make players compare competing narratives and resolve contradictions.',
      'Avoid generic placeholder-style prompts.'
    ].join(' '),
    user: `
Create exactly ${playerCount * 3} player activity cards.

Story:
${storyBlurb}

Breadcrumbs:
${JSON.stringify(trails, null, 2)}

Suspect narratives:
${JSON.stringify(narratives, null, 2)}

Cards must:
- force interaction
- compare knowledge across players
- challenge or support competing narratives
- use evidence, timing, contradiction, or access
- avoid directly stating the answer

Rules:
- each activity should name concrete suspects, objects, or contradictions from this mystery
- at least 4 activities must revolve around contradiction resolution
- at least 3 activities must force players to compare two suspect narratives directly
- avoid generic "Player A / Player B share info" style wording unless grounded in the actual mystery
- make the activities feel playable, specific, and socially tense
`.trim()
  };
}
