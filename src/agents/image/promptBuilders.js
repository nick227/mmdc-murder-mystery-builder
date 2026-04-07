export function defaultPromptBuilder(card) {
  const title = String(card?.card_title || '').trim();
  const body = String(card?.card_contents || '').trim();
  return `Illustration of: ${title}\n${body}`.trim();
}

export const promptBuilders = {
  character(card, context) {
    const themes = context?.story_themes || '';
    const title = String(card?.card_title || '').trim();
    const body = String(card?.card_contents || '').trim();
    return [
      'High-resolution candid photo',
      'Single subject, centered:',
      `${title} - ${body} - ${themes}`,
      'detailed face eyes eyelashes expressive face features',
      'solid background, no text, no letters, no watermarks, no logos.',
      'ultra-realism, 8k high-resolution, dramatic lighting'
    ].filter(Boolean).join('\n');
  },

  story_act(card, context) {
    const themes = context?.story_themes || '';
    const title = String(card?.card_title || '').trim();
    const body = String(card?.card_contents || '').trim();
    return [
      'Atmospheric candid photo of:',
      `${title} - ${body} - ${themes}`,
      'Highly-stylized, haunting, atmospheric, dramatic, and cinematic.',
      'solid background, no text, no letters, no watermarks, no logos.',
      'ultra-realism, 8k high-resolution, dramatic lighting'
    ].filter(Boolean).join('\n');
  }
};

