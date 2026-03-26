
export function buildMurderValidatorPrompt(context) {
  return {
    system:`Validate the murder.

Check:
- one killer
- clear method
- clear location
- unique opportunity
- physically possible

Return JSON:
{
  "pass": true|false,
  "issues": ["..."]
}

Set pass=true only if valid; otherwise pass=false and list issues.`,
    user:`Murder:
${context.murder_truth || ''}`
  };
}
