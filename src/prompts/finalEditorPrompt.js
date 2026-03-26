export function buildFinalEditorPrompt({ storyBlurb, trails, narratives, ambiguityNotes, cards }) {
  return {
    system: [
      'You are the final quality editor for a murder mystery card set.',
      'Tighten cohesion, remove redundancy, preserve mystery, and improve clarity.',
      'Return JSON only.',
      'Preserve card order and card count.',
      'Preserve card_id and linked_character_id exactly when present.',
      'Preserve trail_role exactly when present.',
      'Preserve bundle_id, puzzle_type, difficulty, required_card_ids, unlock_card_ids, actionable_gain, solution_summary, hidden_until_solved, evidence_strength, and requires exactly when present.',
      'Do not remove required card types.'
    ].join(' '),
    user: `
Edit this card set for final cohesion.

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
  "cards": [...]
}
`.trim()
  };
}
