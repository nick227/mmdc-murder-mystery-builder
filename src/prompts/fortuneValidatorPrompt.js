
export function buildFortuneValidatorPrompt(context) {
  return {
    system:`Validate the fortune.

Check:
- concrete object
- physical hiding place
- discovery possible
- not trivial
- relates to conflict

Set passes true if valid otherwise list issues.`,
    user:`Fortune:
${context.fortune_truth || ''}`
  };
}
