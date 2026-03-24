export function buildCardQualityPrompt({
  narrativeSummary,
  misleadingAssumption
}) {

  return {
    system: `
You refine murder mystery cards for clarity, uniqueness, and deduction value.
Do not reveal the killer.
Preserve ambiguity and contradiction.
`,

    user: `
Narratives:
${JSON.stringify(narrativeSummary, null, 2)}

Misleading assumption:
${misleadingAssumption}

Cards:
{{CARDS_PLACEHOLDER}}

Rules:
- remove redundancy
- keep contradictions
- balance suspects
- preserve ambiguity
- do not reveal solution

Return improved cards.
`
  };
}
