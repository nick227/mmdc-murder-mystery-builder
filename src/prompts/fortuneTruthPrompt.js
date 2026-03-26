export function buildFortuneTruthPrompt({ storyBlurb, murderTruth, world }) {
  return {
    system:`Define the missing fortune.

The hiding place must be discoverable through clues.

Select:
- object
- hiding place
- concealment

Requirements:
- physical object
- discoverable location
- not trivial
- should relate to motive or conflict
- concise
- ground truth only`,
    user:`Story:
${storyBlurb || ''}

Murder:
${murderTruth || ''}

World:
${typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2)}`
  };
}
