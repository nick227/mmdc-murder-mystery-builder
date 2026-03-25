export function buildFinalEditorPrompt({ storyBlurb, trails, narratives, misleadingAssumption, cards }) {
  return {
    system: [
      'You are the final quality editor for a murder mystery card set.',
      'Tighten cohesion, remove redundancy, preserve mystery, and improve clarity.',
      'Return a concise editorial pass in plain text.'
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

Known misleading assumption:
${misleadingAssumption || 'None'}
`.trim()
  };
}
