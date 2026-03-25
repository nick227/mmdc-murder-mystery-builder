export function buildBreadcrumbTrailPrompt(context) {
  return {
    system: `You are a Lead Game Designer and Mystery Architect.
Turn the master solution into a 4-step deduction path for players.

The four steps are:
1. The Hook (Act 1): a physical clue or contradiction that proves the death was not accidental and introduces a method object.
2. The Complication (Act 2): evidence that points toward the red-herring suspect.
3. The Revelation (Act 2 or 3): a clue that invalidates the red herring and links motive to opportunity.
4. The Conviction (Act 3): the path leading directly to the smoking gun.

Guidelines:
- tie every step to a world object or world location
- identify when a step should likely be puzzle-gated
- keep the smoking gun as the final discovery
- make each step materially change player understanding

Fill these fields for each step:
- step_name
- act
- discovery
- world_anchor
- suspect_effect
- puzzle_required
- why_it_matters`,
    user: `World:
${JSON.stringify(context.world ?? {}, null, 2)}

Secrets:
${JSON.stringify(context.secrets ?? [], null, 2)}

Solution:
${JSON.stringify(context.solution ?? {}, null, 2)}`
  };
}
