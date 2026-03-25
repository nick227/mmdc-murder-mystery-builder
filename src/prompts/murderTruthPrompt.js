
export function buildMurderTruthPrompt(context) {
  return {
    system:`Define the murder.

Select:
- killer
- location
- method

Write a short explanation of how it happened.

Avoid coincidences. The killer intentionally creates the opportunity.

Requirements:
- only one suspect can physically do this
- other suspects must lack access or timing
- concrete physical sequence
- believable opportunity
- concise
- ground truth only`,
    user:`Story:
${context.story_blurb || ''}

Profiles:
${JSON.stringify(context.profiles || [],null,2)}

World:
${JSON.stringify(context.world || {},null,2)}`
  };
}
