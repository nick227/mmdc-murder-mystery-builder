export function buildClueTargetsPrompt({
  storyBlurb,
  coreTruth,
  characters,
  locations,
  world,
  rejectionReasons = [],
  priorTargets = []
}) {
  const retryHints = Array.isArray(rejectionReasons)
    ? rejectionReasons.filter(Boolean)
    : [];

  return {
    system: `
Generate clue targets for mystery puzzle bundles. Return JSON only.

Rules:
- Write observable facts only.
- Do not identify the killer directly.
- Do not use deduction language.
- Use only playable suspects and established locations.
- Target 4 must act as a convergence/confirmation clue, not a standalone solve.
- Avoid duplicating prior targets.
`.trim(),

    user: `
Story:
${storyBlurb || ''}

Core truth:
${JSON.stringify(coreTruth || {}, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Established locations:
${JSON.stringify(locations || [], null, 2)}

World:
${typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2)}

Previous targets:
${JSON.stringify(priorTargets || [], null, 2)}

Retry hints:
${JSON.stringify(retryHints, null, 2)}
`.trim()
  };
}

export function buildSingleTargetPrompt({
  suspect,
  priorTargets = [],
  locations,
  characters,
  coreTruth,
  storyBlurb,
  world,
  slotIndex
}) {
  return {
    system: `
Generate exactly one clue target fact.

The primary subject must be: ${String(suspect || '').trim()}

Rules:
- observable fact only
- do not identify the killer
- do not uniquely confirm guilt
- preserve ambiguity
- do not use other suspects as the primary subject
- do not duplicate prior targets

Return one target only.
`.trim(),

    user: `
Slot:
${Number(slotIndex) + 1}

Story:
${storyBlurb || ''}

Core truth:
${JSON.stringify(coreTruth || {}, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Established locations:
${JSON.stringify(locations || [], null, 2)}

World:
${typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2)}

Previous targets:
${JSON.stringify(priorTargets || [], null, 2)}
`.trim()
  };
}
