export function buildItemsPromptForCharacter({
  characterName,
  characterBio = '',
  usedItemTitlesCsv = '',
  itemCount = 3
}) {
  const name = String(characterName || '').trim();
  const bio = String(characterBio || '').trim();
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
Character (owns these items):
- name: ${name}
${bio ? `- bio: ${bio}` : ''}

Used item titles (do NOT reuse these):
${used || '(none)'}

Write exactly ${count} item cards for this character.

Rules:
- Each card needs: card_title, card_contents, location_ref (use null if not tied to a single location).
- card_title must be short and specific (avoid generic titles like "Letter" or "Key").
- Do not repeat titles from the used list. Do not create near-duplicates.
- Do not mention "this proves" or "therefore" or state who the killer is.
`.trim()
  };
}
