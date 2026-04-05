export const puzzleTypesContent = {
  cross_reference: [
    'Compare multiple records or items.',
    'Identify one shared factual detail.',
    'Requires at least two cards with overlapping fields.'
  ],

  timeline: [
    'Align time-based facts.',
    'Determine one concrete time.',
    'Requires multiple events with explicit timestamps.'
  ],

  item_combination: [
    'Combine objects or attributes.',
    'Reveal one concrete fact.',
    'Requires cards whose details only make sense together.'
  ],

  elimination: [
    'Apply constraints from the cards.',
    'Rule out all but one possibility.',
    'Requires multiple options with limiting facts.'
  ],

  cipher: [
    'Decode a provided message.',
    'Extract one concrete result.',
    'Requires encoded text and a decoding key.'
  ]
};

export function buildPuzzlePrompt({
  storyBlurb,
  puzzleType,
  clueTarget = {},
  characters: _characters = [],
  locations: _locations = [],
  priorClueTargets: _priorClueTargets = [],
  bundleIndex: _bundleIndex = 0,
  bundleCount: _bundleCount = 4,
  canonicalKiller = '',
  canonicalVictim = '',
  canonicalLocation = '',
  usedClueTitlesCsv = ''
}) {
  const typeLines = puzzleTypesContent[puzzleType] || puzzleTypesContent.cross_reference;
  const killerLine = String(canonicalKiller || '').trim()
    ? `Canonical murderer (from sealed core truth — do not replace or contradict with the answer card): ${String(canonicalKiller).trim()}`
    : 'Murderer identity is fixed elsewhere; do not state a different perpetrator in the answer card.';

  return {
    system: `
You create playable ${puzzleType} puzzles.

${typeLines.map((line) => `- ${line}`).join('\n')}

${killerLine}

Create exactly one puzzle bundle with:
- 2 to 4 evidence seed cards
- 1 gate summary card
- 1 puzzle card
- 1 answer card

Core rules for a playable puzzle:
- The puzzle card asks ONE clear question.
- The puzzle card must NOT reveal the answer.
- The evidence cards are SEED cards (blueprints) that will be expanded later into full documents by a separate agent.
- The answer card is the direct answer (one short factual sentence).
- The gate summary card is a short visible summary or reference sheet players need before the puzzle unlock makes sense.
- The puzzle card must include unlocked_item: a clue and/or interesting item players feel good about unlocking (1 short sentence).

Evidence seed rules:
- These are SEED cards that will be expanded later.
- Each seed must be a rich asset like (Ledger, Log, Map, Transcript, Photo.)
- Include 2–4 representative entries only (not full detail)
- Use consistent fields when comparison is required
- The seed must contain enough structure for a richer document to be generated
- Do not include the final answer


`.trim(),

    user: `
Make one ${puzzleType} puzzle bundle for this story:

${storyBlurb}

Story reference (victim and scene — weave into in-world prose if natural; do not paste as labeled headers):
Victim: ${String(canonicalVictim || '').trim()}
Location: ${String(canonicalLocation || '').trim()}

The pipeline attaches structured murder_canon (victim + location) to cards after you respond — you must NOT output a murder_canon field and must NOT use internal labels like "Canonical victim:" or "Canonical location:" in card text.

Player-facing rules (critical):
- Write only what characters would read in-world (logs, maps, questions).
- Evidence seeds: short stubs only (each card_contents under ~80 words); they will be expanded later.

Clue title uniqueness (hard requirement):
- Evidence seed card_title become final clue card titles in the deck.
- Do NOT reuse any existing clue titles from earlier in the pipeline.
- Evidence seed card_title must be unique within this bundle too.
Existing clue titles (comma-separated):
${usedClueTitlesCsv || '(none)'}

Target clue fact: ${String(clueTarget?.fact || '').trim()}
Target category: ${String(clueTarget?.category || '').trim()}

The answer card (solution) must state exactly the target fact above, verbatim.

Return only bundle content for this puzzle:
- 2–4 evidence seed cards (structured stubs for later expansion)
- 1 gate summary card ("card_type": "gate") that acts like a visible bridge/reference sheet
- 1 puzzle card (the question)
- 1 answer card (the direct answer, 1 sentence)
- The puzzle card must include unlocked_item (1 sentence).
`.trim()
  };
}
