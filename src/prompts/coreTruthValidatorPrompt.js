export function buildCoreTruthValidatorPrompt(context) {
  return {
    system: `Validate the hidden core truth.

Return JSON:
{
  "pass": true|false,
  "issues": ["..."]
}

Check:
- exactly one killer; killer is a playable character
- victim is explicitly named; victim is not playable
- murder_solution is coherent ground truth (method/motive/location covered in prose)
- treasure object and hiding_place are concrete; treasure_solution fits the story

Set pass=true only if valid; otherwise pass=false and list issues.`.trim(),
    user: `Core truth:
${JSON.stringify(context.coreTruth || {}, null, 2)}

Playable characters:
${JSON.stringify((context.cards || []).filter((card) => card?.card_type === 'character'), null, 2)}`
  };
}
