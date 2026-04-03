export function buildCoreTruthPrompt({ storyBlurb, storyMeta, characters, world }) {
  return {
    system: `Define the hidden canonical solution for one murder mystery. Return JSON only.

murder:
- killer: must match a playable character name exactly (from the list)
- victim: one named victim who is NOT playable; must be named in the World text, story concept, host pitch, or supporting people lists (exact wording as given there)
- location: short phrase — where the murder happens
- murder_solution: 3–6 sentences. Ground truth only: what happened, how, why, and how the killer had the opening. No player-facing tone.

treasure:
- object: physical treasure or inheritance object
- hiding_place: a discoverable place (concrete)
- treasure_solution: 2–4 sentences on why it matters and how players could realistically find it (without inventing new canon outside this block)

Rules: one killer; killer commits the crime; victim cannot be a playable character; stay concise.
Let theme tags and host pitch guide motive texture and why the treasure matters.`.trim(),

    user: `Story concept:
${storyBlurb || ''}

Packaging and thematic guidance:
${storyMeta || '(none)'}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

World:
${typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2)}`
  };
}
