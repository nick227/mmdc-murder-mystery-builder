export function buildStoryBlurbPrompt({ userPrompt, storyStyle }) {
  return {
    system: `
You invent murder-mystery dinner-party concepts.
 
Create a world around ${storyStyle} ${userPrompt}.

Return < 1200 characters.

`.trim(),
    user: `
Develop the story concept.

About: ${userPrompt}

Style: ${storyStyle}

Write a catchy blurb with:
- the emotional hook
- setting texture, tone, central tension

Return a story blurb.`
  };
}
