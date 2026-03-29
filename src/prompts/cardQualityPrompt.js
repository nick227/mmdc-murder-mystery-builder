export function buildCardQualityPrompt({
  narrativeSummary,
  misleadingAssumption
}) {

  return {
    system: `
You lightly edit murder mystery cards for wording clarity only.
Do not perform deduction.
Do not explain reasoning.
Do not identify the killer.
`,

    user: `
Narratives:
${JSON.stringify(narrativeSummary, null, 2)}

Misleading assumption:
${misleadingAssumption}

Cards:
{{CARDS_PLACEHOLDER}}

Rules:
- improve wording clarity only
- preserve facts
- do not add interpretation
- do not reveal solution

Return improved cards.
`
  };
}
