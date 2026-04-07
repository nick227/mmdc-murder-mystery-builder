import { getStoryBlurb } from '../../utils/context.js';

export function defaultPromptBuilder(card) {
  const title = String(card?.card_title || '').trim();
  const body = String(card?.card_contents || '').trim();
  return `Illustration of: ${title}\n${body}`.trim();
}

export const promptBuilders = {
  character(card, context) {
    const storyBlurb = getStoryBlurb(context);
    const title = String(card?.card_title || '').trim();
    const body = String(card?.card_contents || '').trim();
    return [
      'Character portrait illustration.',
      'Single subject, centered, high quality, cinematic lighting.',
      storyBlurb ? `Story context: ${storyBlurb}` : '',
      `Character: ${title}`,
      body
    ].filter(Boolean).join('\n');
  },

  story_act(card, context) {
    const storyBlurb = getStoryBlurb(context);
    const title = String(card?.card_title || '').trim();
    const body = String(card?.card_contents || '').trim();
    const act = card?.act;
    return [
      'Story beat illustration.',
      'Atmospheric scene, no text, no letters, no watermarks.',
      storyBlurb ? `Story context: ${storyBlurb}` : '',
      Number.isInteger(act) ? `Act: ${act}` : '',
      `Title: ${title}`,
      body
    ].filter(Boolean).join('\n');
  }
};

