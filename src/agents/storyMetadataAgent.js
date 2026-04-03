import { callJson } from '../llm/client.js';
import { pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const SMOKE = process.env.SMOKE_MODE === 'true';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['story_title', 'story_description', 'story_rating', 'story_themes'],
  properties: {
    story_title: { type: 'string' },
    story_description: { type: 'string' },
    story_rating: { type: 'string' },
    story_themes: { type: 'string' }
  }
};

export async function storyMetadataAgent(context) {
  const concept = getStoryBlurb(context);
  const prompt = {
    system: `You package murder-mystery dinner parties for hosts—title, pitch, rating, and theme tags aligned with the story concept.

Return concise JSON only.`,
    user: `
Story concept:
${concept}

Produce:
- story_title: catchy 3–10 word title (no spoilers)
- story_description: 2–4 sentences for the host and players (spoiler-safe, inviting)
- story_rating: explicit age/content rating (e.g. "Teen 13+", "PG-13 — moderate violence references", "Adult 18+")
- story_themes: comma-separated tags (e.g. "cozy, period drama, locked room, ensemble cast")
`
  };

  let meta;
  if (SMOKE) {
    meta = {
      story_title: 'Smoke Test Manor Mystery',
      story_description: 'A rehearsal dinner party where motives surface and alliances shift.',
      story_rating: 'PG-13 — fictional violence',
      story_themes: 'smoke test, ensemble, rehearsal dinner, secrets'
    };
  } else {
    meta = await callJson({
      ...prompt,
      schemaName: 'story_metadata',
      schema
    });
  }

  context.story_title = String(meta?.story_title || '').trim();
  context.story_description = String(meta?.story_description || '').trim();
  context.story_rating = String(meta?.story_rating || '').trim();
  context.story_themes = String(meta?.story_themes || '').trim();

  const cards = [
    {
      card_type: 'story_meta',
      card_title: 'Story title',
      card_contents: context.story_title,
      act: 1
    },
    {
      card_type: 'story_meta',
      card_title: 'Story description',
      card_contents: context.story_description,
      act: 1
    },
    {
      card_type: 'story_meta',
      card_title: 'Story rating',
      card_contents: context.story_rating,
      act: 1
    },
    {
      card_type: 'story_meta',
      card_title: 'Story themes',
      card_contents: context.story_themes,
      act: 1
    }
  ];

  pushCards(context, 'story_meta', cards);
  return context;
}
