export function buildStoryBlurbPrompt({ userPrompt, storyStyle }) {
  return {
    system: `
You invent murder-mystery dinner-party story blurbs about ${userPrompt}.

Write for dramatic game seed for clarity and playability.

Style is: ${storyStyle}

`.trim(),
    user: `
Develop the story concept (rough, vivid, flexible — not a suspect roster).

About: ${userPrompt}
Style: ${storyStyle}

Cover in prose inside storyBlurb (one dense paragraph):
- who is gathered and why; the missing or contested treasure
- the murder hook and why it matters emotionally or socially
- setting texture: place, era if relevant, mood, social pressure
- tone, central tensions or key conflicts
- capture the reader's attention and set the stage for the game

You are seeding our game pipeline with a single paragraph of story context.

Return:
{ "storyBlurb": "" }`
  };
}
