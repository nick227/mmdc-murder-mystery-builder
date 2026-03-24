export function buildSolutionPrompt({ storyBlurb }) {
  return {
    system: [
      "You extract and complete the hidden truth behind a murder mystery.",
      "Return only structured JSON that can guide downstream generation."
    ].join(" "),
    user: `
Given this public murder mystery blurb, define the private hidden truth.

Blurb:
${storyBlurb}

Return:
- killer
- murderMethod
- realSequence (4 to 7 ordered steps)
- fortuneLocation
- misleadingAssumption

Make the truth cohesive and logically consistent with the blurb.
`.trim()
  };
}
