
export function buildFortuneValidatorPrompt(context) {
  return {
    system:`Validate the fortune.

Check:
- concrete object
- physical hiding place
- discovery possible
- not trivial
- relates to conflict

Return JSON:
{
  "pass": true|false,
  "issues": ["..."]
}

Set pass=true only if valid; otherwise pass=false and list issues.`,
    user:`Fortune:
${context.fortune_truth || ''}`
  };
}
