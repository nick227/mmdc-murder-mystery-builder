export function buildNarrativeValidatorPrompt({ storyBlurb, solution, trails, narratives, characters, priorFailure = null }) {
  return {
    system: [
      'You validate competing suspect narratives for a murder mystery.',
      'Return JSON only.',
      'Do not rewrite the narratives. Validate them against the hidden solution and the playable character roster.',
      'The selected true_narrative must match solution.killer.',
      'Determine whether the set is playable: coherent suspects, correct killer alignment, and no early answer-key collapse.'
    ].join(' '),
    user: `
Review these competing suspect narratives.

Public blurb:
${storyBlurb}

Hidden solution:
${JSON.stringify(solution || {}, null, 2)}

Breadcrumb scaffolding:
${JSON.stringify(trails, null, 2)}

Current narratives:
${JSON.stringify(narratives, null, 2)}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

${priorFailure ? `Previous validation failure to fix first: ${priorFailure}` : ''}

Return exactly this JSON shape:
{
  "pass": true,
  "problems": [],
  "analysis": {
    "suspects": [],
    "true_suspect": "",
    "eliminated_suspect": "",
    "red_herring": "",
    "uses_only_characters": true,
    "matches_solution": true,
    "deduction_possible": true
  }
}

Validation rules:
- suspects must come only from playable character card titles
- analysis.suspects must list the three suspect names used by narratives a, b, and c
- analysis.true_suspect must be the suspect selected by true_narrative
- analysis.matches_solution is true only if analysis.true_suspect equals solution.killer
- analysis.eliminated_suspect should be the suspect most plausibly ruled out by the overall story path (can be empty if unclear; do not fail validation for this alone)
- analysis.red_herring should be a suspect who remains suspicious but is not the true killer (can be empty if unclear; do not fail validation for this alone)
- analysis.deduction_possible is true if players can plausibly narrow suspicion by combining story beats and discoveries (do not require a perfect elimination arc)
- pass can be true only if uses_only_characters and matches_solution are true, and deduction_possible is not clearly false
- each problems entry must be an object with shape { "type": "", "message": "" }
- use deterministic problem types when pass is false, including: invalid_suspect, wrong_killer, no_elimination, weak_deduction, missing_red_herring
- problem.message should be short and specific
`.trim()
  };
}
