export function buildCoreTruthValidatorPrompt(context) {
  return {
    system: `Validate the hidden core truth.

Return JSON:
{
  "pass": true|false,
  "issues": ["..."]
}

Check:
- exactly one killer
- killer is a playable character
- victim is explicitly named
- victim is not a playable character and not the killer
- killer has motive, method, location, and opportunity
- other suspects are reasonably excluded
- treasure is a concrete object
- hiding place is physical and discoverable
- treasure significance aligns with motive or conflict

Set pass=true only if valid; otherwise pass=false and list issues.`.trim(),
    user: `Core truth:
${JSON.stringify(context.coreTruth || {}, null, 2)}

Playable characters:
${JSON.stringify((context.cards || []).filter((card) => card?.card_type === 'character'), null, 2)}`
  };
}
