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
  canonicalLocation = ''
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
- 1 puzzle card
- 1 answer card

Core rules for a playable puzzle:
- The puzzle card asks ONE clear question.
- The puzzle card must NOT reveal the answer.
- The evidence cards are SEED cards (blueprints) that will be expanded later into full documents by a separate agent.
- The answer card is the direct answer (one short factual sentence).
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

<<<CANON_VICTIM>>>
${String(canonicalVictim || '').trim()}
<<<CANON_LOCATION>>>
${String(canonicalLocation || '').trim()}

Every evidence seed card and the puzzle card must include the victim string and the location string above as plain substrings somewhere in the natural in-world text.

Player-facing rules (critical):
- Do NOT use labels like "Canonical victim:", "Canonical location:", "Victim:", "READ-ONLY", or any internal/meta header. Write only what characters would read in-world (logs, maps, questions).
- Evidence seeds: short stubs only (each card_contents under ~80 words); they will be expanded later.

Target clue fact: ${String(clueTarget?.fact || '').trim()}
Target category: ${String(clueTarget?.category || '').trim()}

The answer card (solution) must state exactly the target fact above, verbatim.

Return only bundle content for this puzzle:
- 2–4 evidence seed cards (structured stubs for later expansion)
- 1 puzzle card (the question)
- 1 answer card (the direct answer, 1 sentence)
- The puzzle card must include unlocked_item (1 sentence).
`.trim()
  };
}
