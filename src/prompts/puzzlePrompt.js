export const puzzleTypesContent = {
  cross_reference: [
    'Question stem: start from "Which ..." such as which location, which record, or which person was tied to a specific detail.',
    'Compare multiple records or labels to isolate one shared factual detail.'
  ],

  timeline: [
    'Question stem: start from "When did ..." or "At what time ...".',
    'Order or align time-based evidence to find one concrete timing fact.'
  ],

  item_combination: [
    'Question stem: start from "What ..." or "Which single fact emerges when ...".',
    'Combine physical items or attributes that only make sense together to reveal one concrete fact.'
  ],

  elimination: [
    'Question stem: start from "Which possibility is impossible ..." or "Which option is ruled out ...".',
    'Use constraints in the visible evidence to rule out exactly one possibility or confirm one concrete limit.'
  ],

  cipher: [
    'Question stem: start from "What does the decoded message state ..." or "Which location or name ...".',
    'Decode an encoded message using a provided key.'
  ]
};

function bundlePositionGuidance(bundleIndex, bundleCount) {
  const n = Number(bundleCount) || 4;
  const i = Number(bundleIndex) || 0;
  const isFirst = i === 0;
  const isFinal = i === n - 1;

  if (isFirst) {
    return `
Bundle position: first of ${n}.
- This bundle opens the chain: evidence should establish discoverable facts players need before later constraints.
- Do not assume players hold hidden clues from later bundles.
`.trim();
  }

  if (isFinal) {
    return `
Bundle position: final (${n} of ${n}). Final bundle must confirm, not solve:
- Confirm a suspect already constrained by earlier clues.
- Do not introduce a completely new decisive fact that could prove guilt or identity without the earlier chain.
- Require earlier bundle information to interpret correctly.
- The hidden clue remains the direct answer to this bundle's puzzle question, but its meaning must land as confirmation after prior constraints, not as the opening case.
`.trim();
  }

  return `
Bundle position: middle (${i + 1} of ${n}).
- This bundle should add constraints that narrow time, movement, access, or object linkage.
- Evidence and puzzle framing may lightly echo earlier discovered facts so the clue chain feels connected.
- Earlier bundles should meaningfully narrow suspects; do not save all decisive evidence for the final bundle.
`.trim();
}

export function buildPuzzlePrompt({
  storyBlurb,
  puzzleType,
  clueTarget,
  characters = [],
  locations = [],
  priorClueTargets = [],
  bundleIndex = 0,
  bundleCount = 4,
  finalDependencyHint = ''
}) {
  const typeLines = puzzleTypesContent[puzzleType] || puzzleTypesContent.cross_reference;
  const targetFact = String(clueTarget?.fact || '').trim();
  const targetCategory = String(clueTarget?.category || '').trim();
  const act = clueTarget?.act === 1 || clueTarget?.act === 2 || clueTarget?.act === 3 ? clueTarget.act : null;
  const positionBlock = bundlePositionGuidance(bundleIndex, bundleCount);
  const safePriorClueTargets = Array.isArray(priorClueTargets) ? priorClueTargets.filter(Boolean) : [];

  return {
    system: `
Design a playable ${puzzleType} puzzle.

${typeLines.map((line) => `- ${line}`).join('\n')}

${positionBlock}

Create exactly one puzzle bundle with:
- 2 to 4 visible evidence cards
- 1 visible puzzle card
- 1 hidden clue card

The hidden clue card is the puzzle answer and the revealed clue.
The puzzle question must have exactly one clear answer.
The puzzle should be solvable within a single play session using only this bundle's visible evidence cards.

Do not use the word "contradiction" in puzzle text, evidence, or instructions.
Do not ask players to "extract" or "find the contradiction."
Use the type-specific question stem style shown above.

When naming suspects or places in evidence or puzzle text:
- use only the provided playable character names
- use only the provided established location names
- do not invent new witnesses, rooms, wings, archives, docks, terraces, gates, or landmarks

Time discipline:
- Do not invent new clock times unless the target clue fact already includes one.
- Prefer relative timing language such as "before the scene", "during the performance", or "after the body was discovered".
- If any visible evidence mentions a specific clock time, every other time reference in the bundle must be consistent with it.

If this is the final bundle: confirm prior constraints; do not standalone-solve; require earlier clue context to interpret the confirmation.
`.trim(),

    user: `
Craft a ${puzzleType} puzzle bundle based on the following story context:

Story:
${storyBlurb}

Playable characters:
${JSON.stringify(characters || [], null, 2)}

Established locations:
${JSON.stringify(locations || [], null, 2)}

Target clue fact:
${targetFact}

Target category:
${targetCategory}
${act != null ? `\nAct: ${act}` : ''}

Return only bundle content for this puzzle:
- visible evidence cards that support the puzzle
- one puzzle card whose question follows the ${puzzleType} stem style and asks for one factual answer derivable from the evidence
- one hidden clue card whose text is the direct answer to the puzzle

The hidden clue must:
- match the target clue fact
- be directly discoverable from the visible evidence
- have one clear answer

This puzzle should build on information discovered in earlier bundles when applicable.
Earlier bundles contribute constraints to the overall case. Phrase this bundle so it adds the intended constraint or confirmation without duplicating prior target facts verbatim.
Earlier bundles should meaningfully narrow suspects. Do not reserve all decisive evidence for the final bundle.
Do not create fresh explicit clock times unless they already appear in the target clue fact; use relative timing instead.
${safePriorClueTargets.length ? `

Earlier clue target facts:
${safePriorClueTargets.map((fact) => `- ${fact}`).join('\n')}

This puzzle should build on information discovered in earlier bundles.
Do not require players to read another bundle to understand this puzzle.
Instead, let the evidence or puzzle framing lightly echo at least one earlier clue target concept so the clue chain feels connected.
` : ''}
${finalDependencyHint ? `

${finalDependencyHint}
` : ''}${bundleIndex === (bundleCount || 4) - 1 ? `

Final bundle: tie evidence text to at least one fact from an earlier clue target, but keep the answer derivable from this bundle's visible evidence.
` : ''}

Do not write meta-explanations, detective reasoning, or conclusion language.
`.trim()
  };
}
