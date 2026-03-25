function normalizeName(value) {
  return String(value || '')
    .replace(/[—–-].*$/, '')
    .trim();
}

function summarizeRoles(narratives, solutions) {
  const entries = ['a', 'b', 'c'].map((key) => ({
    key,
    suspect: normalizeName(narratives?.[key]?.suspect)
  }));

  const killer = normalizeName(solutions?.killer);
  const killerEntry = entries.find((entry) => entry.suspect === killer);

  return {
    killer,
    killerKey: killerEntry?.key || null,
    entries
  };
}

export function buildNarrativeValidatorPrompt({ storyBlurb, solutions, trails, narratives, priorFailure = null }) {
  const roleSummary = summarizeRoles(narratives, solutions);

  return {
    system: [
      'You validate and rewrite competing suspect narratives for a murder mystery.',
      'Your job is to balance evidence across narratives so one suspect does not become obviously dominant too early.',
      'You must introduce at least one hard contradiction that players must resolve logically, not just thematically.',
      'You must enforce strict deduction arc rules so the final accusation path is: eliminate one suspect cleanly, explain one suspect as a red herring, then accuse the true killer.',
      'The selected true_narrative MUST match solutions.killer by suspect name.',
      'Return only JSON.'
    ].join(' '),
    user: `
Review and improve these competing suspect narratives.

Public blurb:
${storyBlurb}

Private truth:
${JSON.stringify(solutions, null, 2)}

Breadcrumb scaffolding:
${JSON.stringify(trails, null, 2)}

Current narratives:
${JSON.stringify(narratives, null, 2)}

Resolved suspect mapping:
${JSON.stringify(roleSummary, null, 2)}

${priorFailure ? `Previous validation failure to fix first: ${priorFailure}` : ''}

Validation goals:
1. each narrative centers on a different suspect
2. all three are plausible
3. at least three explicit contradiction hooks exist across the full set
4. at least one contradiction must be HARD:
   - mutually exclusive alibi
   - impossible movement
   - object access conflict
   - timing contradiction
5. no narrative reads like solved truth too early
6. evidence is distinct and non-redundant
7. exactly one true_narrative remains selected
8. each narrative has roughly comparable persuasive weight IN ACT 1-2 only
9. avoid letting one suspect receive the majority of hard evidence before Act 3
10. the suspect named in solutions.killer must be the suspect selected by true_narrative
11. the killer's narrative_arc must describe actual guilt, not innocence, exclusion, or red-herring framing

Critical rules:
- Do NOT assume narrative a, b, or c is the killer. Use suspect names.
- The suspect matching solutions.killer must be the selected true_narrative.
- Any non-killer suspect may be suspicious, but must ultimately fail by alibi, contradiction, or missing object-chain logic.
- The killer must end with motive + opportunity + the strongest contradiction/object-chain convergence by Act 3.
- If a narrative currently describes the true killer as innocent or excluded, rewrite it.
- If true_narrative currently points to the wrong suspect, fix both the selection and the narrative content so they align.

Rewrite weak narratives so they satisfy these rules.

Return improved narratives only.
`.trim()
  };
}
