export function buildClueBriefsPrompt({
  storyBlurb,
  storyMeta,
  coreTruth,
  suspectRoster = [],
  totalClues = 0
}) {
  const victim = String(coreTruth?.murder?.victim || 'the victim').trim();
  const location = String(coreTruth?.murder?.location || 'the crime scene').trim();
  const killer = String(coreTruth?.murder?.killer || 'the killer').trim();

  return {
    system: 'Create structured clue briefs for a murder mystery game. Return JSON only.',
    user: `Create ${totalClues} clue briefs for a murder mystery game.

Story concept:
${storyBlurb}

Packaging and thematic guidance:
${storyMeta || '(none)'}

HIDDEN murder truth (do NOT reveal directly):
Killer: ${killer}
Victim: ${victim}
Location: ${location}

Playable suspects (use name or title for target_name, or null):
${JSON.stringify(suspectRoster, null, 2)}

Each brief must include:
- item_name (short title for the clue)
- target_name (suspect name/title or null)
- strength (low, mid, high)
- uniqueness_angle (what makes this clue distinct)
- description_seed (short seed for the prose writer)

Rules:
- Generate exactly ${totalClues} briefs.
- All suspects must be implicated at least once (target_name).
- The killer should have the strongest overall signal (more high strengths).
- Vary item types and angles; avoid duplicates.
- Do not identify the killer.
- Do not state any clue as confirmed fact.
- Each brief must stand alone.`
  };
}

export function buildClueProsePrompt({
  storyBlurb,
  storyMeta,
  victim,
  location,
  briefs = []
}) {
  return {
    system: 'Write clear, readable clue prose from briefs. Return JSON only.',
    user: `Write final clue prose from the briefs below.

Story concept:
${storyBlurb}

Packaging and thematic guidance:
${storyMeta || '(none)'}

Victim: ${victim}
Location: ${location}

Briefs (keep order):
${JSON.stringify(briefs, null, 2)}

Rules:
- Return exactly ${briefs.length} clues in the same order.
- Each clue must include card_contents only.
- Each clue must explicitly describe the item_name from its brief.
- Follow the uniqueness_angle to keep clues distinct.
- Write 1-3 clear sentences per clue.
- Keep each card_contents under 40 words.
- Use suggestive or uncertain tone.
- Do not identify the killer.
- Do not state any clue as confirmed fact.
- Each clue must stand alone.`
  };
}
