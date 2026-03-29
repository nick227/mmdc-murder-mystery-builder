export function buildBreadcrumbTrailPrompt({
  murder_truth,
  fortune_truth,
  world,
  solution,
  locations
}) {
  const murderBlock = typeof murder_truth === 'string' ? murder_truth : JSON.stringify(murder_truth || {}, null, 2);
  const fortuneBlock = typeof fortune_truth === 'string' ? fortune_truth : JSON.stringify(fortune_truth || {}, null, 2);
  const worldBlock = typeof world === 'string' ? world : JSON.stringify(world || {}, null, 2);

  return {
    system: `
You write exactly three breadcrumb investigation trails for a social deduction murder mystery.

Use the hidden solution as ground truth for planning beats (players must not be handed the killer's name as a conclusion).

Trail roles (in order — trails[0], trails[1], trails[2]):
1. RED-HERRING LEAN — beats that reasonably widen suspicion toward suspects other than solution.killer. Do not confirm an alternate killer.
2. KILLER-ALIGNED — beats that tighten opportunity, access, method, or motive in ways that later converge on solution.killer without naming them as killer in any beat.
3. AMBIGUOUS — beats that could cut multiple ways until combined with clues from other trails or cards.

Each trail:
- must include one location_ref chosen from the known locations
- 3-4 beats; each beat has concrete "information" and a social "game" prompt
- final beat of each trail narrows suspicion but does not identify the killer alone (no single beat solves the case)

Guidelines:
- physical, discoverable details
- concise
- each beat changes what players think they know
`.trim(),
    user: `
Hidden solution (private — structure beats around this, never reveal it outright):
${JSON.stringify(solution || {}, null, 2)}

Murder truth:
${murderBlock}

Fortune:
${fortuneBlock}

World:
${worldBlock}

Known locations:
${JSON.stringify(locations || [], null, 2)}

Return JSON with exactly three trails in order: red-herring lean, killer-aligned, ambiguous.
`
  };
}

