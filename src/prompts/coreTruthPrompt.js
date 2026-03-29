export function buildCoreTruthPrompt({ storyBlurb, characters, world }) {
  return {
    system: `Define the hidden core truth for a murder mystery.

Return JSON only.

Requirements:
- choose exactly one killer
- the killer MUST be one of the playable characters provided and must match the name exactly
- name exactly one victim
- the victim MUST NOT be one of the playable characters provided
- the victim should be an established story/world person when possible, not an unnamed role like "the victim" or "the steward"
- the killer must physically commit the murder
- murder details must be concrete, plausible, and intentional
- treasure details must be physically discoverable through clues
- the treasure should connect to the motive, conflict, inheritance, leverage, or cover-up
- concise
- ground truth only

Return exactly:
{
  "murder": {
    "killer": "exact playable character name",
    "victim": "explicit victim name, not a playable suspect",
    "location": "concrete murder location",
    "method": "concrete murder method",
    "motive": "explicit motive",
    "summary": "2-4 sentences describing how it happened",
    "opportunity": "why the killer had the opening to do it",
    "why_others_could_not": ["short exclusion", "short exclusion"]
  },
  "treasure": {
    "object": "physical treasure or inheritance object",
    "hiding_place": "discoverable physical location",
    "concealment": "how it is hidden there",
    "significance": "why it matters to the conflict or motive",
    "discovery_path": "how players could plausibly uncover it"
  }
}`.trim(),

    user: `Story:
${storyBlurb || ''}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

World:
${typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2)}`
  };
}
