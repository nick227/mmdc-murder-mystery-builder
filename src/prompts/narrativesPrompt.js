export function buildNarrativesPrompt({ storyBlurb, solution, trails, playerCount, characters }) {
  return {
    system: [
      'You generate three competing suspect narratives for a murder mystery.',
      'Return JSON only.'
    ].join(' '),
    user: `
Create 3 competing suspect narratives (a, b, c). Keep them short and usable.

Public blurb:
${storyBlurb}

Breadcrumb scaffolding:
${JSON.stringify(trails, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Hidden solution (for alignment only; do not reveal in wording):
${JSON.stringify(solution || {}, null, 2)}

Player count:
${playerCount}

Rules:
- suspects must be chosen ONLY from playable characters (use exact name before the comma in card_title)
- a, b, c must use three different suspects
- true_narrative must be the one whose suspect equals solution.killer
- keep all three plausible and debatable (no forensic proof, no answer-key language)

For each narrative object, fill required fields tersely:
- suspect: character name (exact)
- motive: 1 sentence
- opportunity: 1 sentence
- supporting_evidence: 2-4 short bullets
- misleading_evidence: 1-3 short bullets
- contradiction_hooks: 1-3 short bullets players can investigate
- narrative_arc: 2-3 sentences across acts

story_paths:
- usually return [] (only include if you have a genuinely helpful extra player-facing path)

Return:
{
  "narratives": {
    "a": {...},
    "b": {...},
    "c": {...},
    "true_narrative": "a"
  },
  "story_paths": []
}
`.trim()
  };
}
