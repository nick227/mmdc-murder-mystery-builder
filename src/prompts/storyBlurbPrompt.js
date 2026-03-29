export function buildStoryBlurbPrompt({ userPrompt, storyStyle }) {
  return {
    system: `
You create strong murder mystery premises for social deduction games.

Return structured foundation data, not loose prose only.

The story should be engaging and have enough complexity to support a multi-stage game.
The premise must stay card-friendly: recurring people, locations, and investigation-relevant objects should be explicit enough to turn into cards later.
`.trim(),
    user: `
Craft a one-paragraph murder mystery premise plus seed entities.

About: ${userPrompt}
Style: ${storyStyle}

Requirements:
- one thematic murder
- a missing valuable treasure
- creative setting
- tone and theme
- storyBlurb must be one paragraph only
- people are supporting or world figures explicitly present in the premise; do not try to generate the full suspect roster here
- locations should be recurring investigation-relevant places, not generic rooms
- items should be recurring investigation-relevant objects, fixtures, records, or treasures

Return:
{
  "storyBlurb": "",
  "people": [
    { "name": "", "summary": "" }
  ],
  "locations": [
    { "name": "", "summary": "" }
  ],
  "items": [
    { "name": "", "summary": "" }
  ]
}`
  };
}
