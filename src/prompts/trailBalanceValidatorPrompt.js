
export function buildTrailBalanceValidatorPrompt({ storyBlurb, solutions, trails }) {
  return {
    system: [
      "You are a validator and rewriter for murder mystery breadcrumb trails.",
      "Your job is to improve mystery balance and uniqueness before cards are generated.",
      "Preserve ambiguity and terminal competition across suspects.",
      "Return only JSON."
    ].join(" "),
    user: `
Review and rewrite these trails if needed.

Public blurb:
${storyBlurb}

Private truth:
${JSON.stringify(solutions, null, 2)}

Trails:
${JSON.stringify(trails, null, 2)}

Validation goals:
1. No single suspect dominates the entire mystery
2. At least 3 characters are materially implicated
3. At least 2 characters have soft counterweight evidence
4. Discoveries are unique and non-redundant
5. Objects are varied and not repetitive
6. Held knowledge is partitioned across the cast
7. At least one trail contains contradiction or tension between accounts
8. Final steps still preserve a deduction gap
9. Trails imply rather than confirm
10. The three final steps must not all converge on the same suspect
11. The three final steps should distribute terminal focus across different suspects or competing theories
12. focus_suspect values should remain meaningful and usable downstream

Rewrite weak trails so they satisfy the goals above.

Return improved trails only.
`.trim()
  };
}
