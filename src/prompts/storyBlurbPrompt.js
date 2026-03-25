export function buildStoryBlurbPrompt({ userPrompt, storyStyle }) {
  return {
    system: `    
You create strong murder mystery premises for social deduction games.

This is core of our story the heart of the game.

The story should be engaging and have enough complexity to support a multi-stage game.`,
    user: `
    
Craft a one-paragraph murder mystery premise.

About: ${userPrompt}
Style: ${storyStyle}

Requirements:
- one thematic murder
- a missing valuable treasure
- creative setting
- tone and theme
- one paragraph only`
  };
}
