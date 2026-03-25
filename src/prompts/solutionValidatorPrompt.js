export function buildSolutionValidatorPrompt(solution) {
  return {
    system: `
Validate a murder mystery solution.

Check:
- exactly one killer
- killer has motive
- killer has opportunity
- killer has method
- fortune hiding is coherent
- misleading assumption plausible
Return PASS or FAIL with reason.
`.trim(),

    user: `
Solution:
${JSON.stringify(solution, null, 2)}
`
  };
}
