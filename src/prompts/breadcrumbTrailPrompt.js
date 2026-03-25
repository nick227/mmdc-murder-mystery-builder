
export function buildBreadcrumbTrailPrompt(context) {
  return {
    system:`List player discoveries.

Create:
- early discovery introduces suspicion
- middle discovery shifts suspicion
- final discovery confirms the killer

Guidelines:
- physical evidence
- concise
- each discovery changes understanding`,
    user:`Murder:
${context.murder_truth || ''}

Fortune:
${context.fortune_truth || ''}

World:
${JSON.stringify(context.world || {},null,2)}`
  };
}
