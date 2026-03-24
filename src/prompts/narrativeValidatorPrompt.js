export function buildNarrativeValidatorPrompt({ storyBlurb, solutions, trails, narratives }) {
  return {
    system: [
      "You validate and rewrite competing suspect narratives for a murder mystery.",
      "Your job is to balance evidence across narratives so one suspect does not become obviously dominant too early.",
      "You must introduce at least one hard contradiction that players must resolve logically, not just thematically.",
      "Return only JSON."
    ].join(" "),
    user: `
Review and improve these competing suspect narratives.

Public blurb:
${storyBlurb}

Private truth:
${JSON.stringify(solutions, null, 2)}

Breadcrumb scaffolding:
${JSON.stringify(trails, null, 2)}

Narratives:
${JSON.stringify(narratives, null, 2)}

Validation goals:
1. each narrative centers on a different suspect
2. all three are plausible
3. at least three explicit contradiction hooks exist across the full set
4. at least one contradiction must be HARD:
   - mutually exclusive alibi
   - impossible movement
   - object access conflict
   - timing contradiction
5. no narrative reads like solved truth
6. evidence is distinct and non-redundant
7. exactly one true_narrative remains selected
8. each narrative has roughly comparable persuasive weight
9. avoid letting one suspect receive the majority of hard evidence

Rewrite weak narratives so they satisfy these rules.

Return improved narratives only.
`.trim()
  };
}
