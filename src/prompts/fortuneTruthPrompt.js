
export function buildFortuneTruthPrompt(context) {
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
${context.story_blurb || ''}

Murder:
${context.murder_truth || ''}

World:
${JSON.stringify(context.world || {},null,2)}`
  };
}
