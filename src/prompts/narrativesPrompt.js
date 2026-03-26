export function buildNarrativesPrompt({ storyBlurb, solution, trails, playerCount, characters }) {
  return {
    system: [
      'You generate competing suspect narratives for a murder mystery.',
      'These are story-path perspectives and social pressure, not a forensic report.',
      'Each narrative must center on a different suspect.',
      'Suspects must come from the playable characters provided.',
      'The selected true_narrative must match solution.killer.',
      'You may invent additional world detail and dead-end color, but do not treat invented details as definitive proof.',
      'Keep everything consistent with the public blurb and the breadcrumb scaffolding.'
    ].join(' '),
    user: `
Create 3 competing suspect narratives for this mystery.

Public blurb:
${storyBlurb}

Hidden solution:
${JSON.stringify(solution || {}, null, 2)}

Breadcrumb scaffolding:
${JSON.stringify(trails, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Player count:
${playerCount}

Requirements:
- narrative a, b, c must each center on a different suspect
- each needs motive and opportunity
- each needs suspicious social behavior, vague movement, or emotional reactions
- keep all three debatable and coherent
- do not write direct answer-key language
- suspects must be selected from the playable characters above
- the narrative whose suspect matches solution.killer must be the selected true_narrative
- the killer narrative must not describe them as innocent, excluded, or a red herring
- non-killer narratives may sound plausible, but must remain socially suspicious rather than mechanically proven

Optional enrichment:
- include a top-level story_paths array (any length, may be empty) describing additional player-facing story paths to explore
- story paths should enhance the blurb and breadcrumb trails, not replace them

Return:
{
  "narratives": {
    "a": {...},
    "b": {...},
    "c": {...},
    "true_narrative": "a"
  },
  "story_paths": [
    {
      "title": "Path name",
      "summary": "1-2 sentences",
      "beats": ["3-5 short beats players might follow"],
      "involved_characters": ["character names from playable characters"]
    }
  ]
}
`.trim()
  };
}
