export function buildMurderTruthPrompt({ storyBlurb, characters, world }) {
  return {
    system:`Define the murder.

Select:
- killer
- location
- method

Write a short explanation of how it happened.

Avoid coincidences. The killer intentionally creates the opportunity.

Requirements:
- the killer MUST be one of the playable characters provided (match the name exactly)
- only one suspect can physically do this
- other suspects must lack access or timing
- concrete physical sequence
- believable opportunity
- concise
- ground truth only
- name the killer in the prose using the exact playable character name (same spelling as provided)`,

    user:`Story:
${storyBlurb || ''}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

World:
${typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2)}`
  };
}
