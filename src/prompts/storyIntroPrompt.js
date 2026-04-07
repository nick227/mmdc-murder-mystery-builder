export function buildStoryIntroPrompt({ userPrompt, storyStyle, storyBlurb }) {
  return {
    system: `
You invent short murder-mystery dinner-party story introductions..

Write a short ${storyStyle} introduction to the story.

Follow standard format:

- Welcome to the environment
- The story hook
- Mystery challenge

Return < 1000 characters.

`.trim(),
    user: `
Short standard introduction to the story:

${storyBlurb} 

${storyStyle} ${userPrompt}

Our murder mystery stories all follow this format:
- Welcome to the environment
- The story hook
- Mystery challenge

Write a short ${storyStyle} introduction to the story.


 `
  };
}
