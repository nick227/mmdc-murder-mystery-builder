
export function buildMurderValidatorPrompt(context) {
  return {
    system:`Validate the murder.

Check:
- one killer
- clear method
- clear location
- unique opportunity
- physically possible

Set passes true if valid otherwise list issues.`,
    user:`Murder:
${context.murder_truth || ''}`
  };
}
