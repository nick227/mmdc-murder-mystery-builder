export function buildItemsPromptForCharacter({
  storyTitle = '',
  storyBlurb = '',
  characterName,
  characterBio = '',
  otherCharacterNamesCsv = '',
  usedItemTitlesCsv = '',
  itemCount = 3
}) {
  const title = String(storyTitle || '').trim();
  const blurb = String(storyBlurb || '').trim();
  const name = String(characterName || '').trim();
  const bio = String(characterBio || '').trim();
  const others = String(otherCharacterNamesCsv || '').trim();
  const used = String(usedItemTitlesCsv || '').trim();
  const count = Number(itemCount) || 3;

  return {
    system: [
      'You write short item cards for a murder mystery party.',
      'Items are physical, inspectable objects that can be held or examined during play.',
      'Write observable facts only (no deductions, no conclusions).',
      'Items should meaningfully influence gameplay by appearing in the narrative flow and stimulate, create and encourage player interaction and performances.',
      'For example, props during roleplay, or inspectable evidence, or requiring interactions between players.'
    ].join(' '),
    user: `
Character (owns these items):
- name: ${name}
${bio ? `- bio: ${bio}` : ''}

Story: ${title || ''}
${blurb || ''}

Other playable characters (for interaction):
${others || '(unknown)'}

Used item titles (do NOT reuse):
${used || '(none)'}

Write exactly ${count} item cards for this character.

Goal:
Items should actively influence gameplay by appearing in the narrative flow,
supporting clues or deductions, and encouraging performances, interactions, or discoveries with other players.

Rules:
- card_title must be short and informative (avoid generic titles like "Letter" or "Key").
- Do not repeat titles from the used list. Do not create near-duplicates.
- Do not mention "this proves" or "therefore" or state who the killer is.
`.trim()
  };
}
