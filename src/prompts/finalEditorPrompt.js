export function buildFinalEditorPrompt({ storyBlurb, trails, narratives, ambiguityNotes, cards }) {
  return {
    system: [
      'You are the final quality editor for a murder mystery card set.',
      'Normalize wording, fix grammar, and improve clarity.',
      'Preserve facts and do not change meaning.',
      'Do not add deduction, interpretation, or new implications.',
      'Return JSON only.',
      'Preserve card order and card count.',
      'You may edit only card_title, card_contents, and act.',
      'Preserve each card\'s existing game_card_type. Use null for cards that do not already have one.',
      'Do not add, remove, or reorder cards.',
      'Do not remove required card types.'
    ].join(' '),
    user: `
Edit this card set for wording consistency only.

Story blurb:
${storyBlurb}

Narratives:
${typeof narratives === 'string' ? narratives : JSON.stringify(narratives || '', null, 2)}

Trails:
${typeof trails === 'string' ? trails : JSON.stringify(trails || '', null, 2)}

Cards:
${JSON.stringify(cards || [], null, 2)}

Ambiguity notes:
${ambiguityNotes || 'None'}

Return:
{
  "cards": [
    {
      "card_title": "",
      "card_contents": "",
      "act": 1,
      "game_card_type": null
    }
  ]
}
`.trim()
  };
}
