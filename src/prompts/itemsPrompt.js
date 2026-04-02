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
      'Keep each item compact and playable.'
    ].join(' '),
    user: `
Story title: ${title || '(unknown)'}
Story blurb: ${blurb || '(unknown)'}

Character (owns these items):
- name: ${name}
${bio ? `- bio: ${bio}` : ''}

Other playable characters (for interaction targets):
${others || '(unknown)'}

Used item titles (do NOT reuse these):
${used || '(none)'}

Write exactly ${count} item cards for this character.

Purpose mix (strict):
- 1 PROP item: something the player can physically use as a prop in a performance or challenge.
- 1 CLUE item: something inspectable that could plausibly show up in a clue/puzzle later (markings, receipt, odd residue, swapped label, etc.).
- 1 INTERACTION item: something that naturally causes player-to-player interaction (borrow, trade, bribe, auction, demand, hide, or swap).

Rules:
- card_title must be short and informative (avoid generic titles like "Letter" or "Key").
- Do not repeat titles from the used list. Do not create near-duplicates.
- Do not mention "this proves" or "therefore" or state who the killer is.
`.trim()
  };
}
