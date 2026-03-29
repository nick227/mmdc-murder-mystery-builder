
export function buildTrailBalanceValidatorPrompt({ storyBlurb, solution, trails }) {
  return {
    system: [
      'You are a validator and rewriter for murder mystery breadcrumb trails.',
      'Your job is to improve mystery balance and uniqueness before cards are generated.',
      'Preserve ambiguity and terminal competition across suspects.',
      'Enforce the deduction arc: Act 2 eliminates the ambitious suspect, Act 3 isolates the true killer.',
      'Return only JSON.'
    ].join(' '),
    user: `
Review and rewrite these trails if needed.

Public blurb:
${storyBlurb}

Private truth:
${JSON.stringify(solution, null, 2)}

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

CRITICAL DEDUCTION ARC RULES — rewrite any trail that violates these:
- The trail investigating the ambitious/chef suspect must reach a clean Act 2 elimination. Its final beat should establish the kitchen alibi as unbreakable. Do not weaken this trail's alibi.
- The trail investigating the reclusive suspect must redirect at the end toward the inheritance only. Its final beat should explain their presence near the hiding spot as fortune-seeking, not murder. Remove any beat that makes their forensic connection to the murder weapon exclusive or definitive.
- The trail investigating the true killer must build the object chain (personal item → weapon → poison → victim) across its beats. Its final beat should surface the timeline contradiction that locks them in.
- The mold-destruction trail must frame the mold break as deliberate misdirection by the true killer — not spontaneous anger by the chef or accident. This is the distraction trail, and its final beat should point back to whoever orchestrated the chaos.
- Reduce duplicate "seen near greenhouse/crime scene" beats for the reclusive suspect — they should appear once (early, Act 1) and then be explained away, not pile up.

Rewrite weak trails so they satisfy the goals above.

Return improved trails only.
`.trim()
  };
}
