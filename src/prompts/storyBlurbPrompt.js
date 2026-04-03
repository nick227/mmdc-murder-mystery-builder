export function buildStoryBlurbPrompt({ userPrompt, storyStyle }) {
  return {
    system: `
You invent murder-mystery dinner-party premises as raw story material.

Write for dramatic clarity and playability, not marketing copy and not JSON entity lists.
A later step will expand the world into card-ready titles, tags, and host-facing packaging.

Return JSON with a single string field storyBlurb only.
`.trim(),
    user: `
Develop the story concept (rough, vivid, flexible — not a suspect roster).

About: ${userPrompt}
Style: ${storyStyle}

Cover in prose inside storyBlurb (2–5 short paragraphs or one rich treatment):
- who is gathered and why; the missing or contested treasure MacGuffin
- the murder hook and why it matters emotionally or socially
- setting texture: place, era if relevant, mood, social pressure
- tone, central tensions, and ideas players should feel (light spoilers for designers only)
- a few memorable images or conflicts you want the experience to orbit — names optional, no need to exhaust NPCs or prop lists

Do not output separate people/locations/items arrays. Do not assign the final playable suspect roster.

Return:
{ "storyBlurb": "" }`
  };
}
