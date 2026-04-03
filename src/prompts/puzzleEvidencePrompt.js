export function buildPuzzleEvidencePrompt({ storyBlurb, puzzle, answer, currentEvidenceCard, otherEvidenceCards }) {
  return {
    system: [
      'You expand ONE evidence card text for a murder mystery party puzzle bundle.',
      'Return JSON only.',
      'Keep everything as plain text in card_contents (no structured assets).',
      'Evidence can be long and detailed when it helps playability.',
      'Do not change card_id.',
      'Tag the evidence card with evidence_type.'
    ].join(' '),
    user: `
Story:
${storyBlurb}

Puzzle card:
${JSON.stringify(puzzle, null, 2)}

Answer card:
${JSON.stringify(answer, null, 2)}

Evidence card to expand (keep card_title, rewrite card_contents only):
${JSON.stringify(currentEvidenceCard, null, 2)}

Other evidence cards in this same bundle (context only; do not rewrite):
${JSON.stringify(otherEvidenceCards || [], null, 2)}

Good examples of evidence:
- logs, schedules, lists, notes, transcripts, ledgers, receipts, rosters
- diagrams, maps, images, photos, illustrations, receipts, documents, contracts

All evidence stays plain text in card_contents (no structured assets).

Full documents as text:
- "The full transcript of the interview with the suspect"
- "An official document from the police department"
- "A detailed report from the crime scene"

Maps as text:
- ASCII layout: [Study] — [Hall] — [Kitchen]
- Grid map: A1 Study
- Adjacency map: Study connects to Hall

Images as AI image prompts:
- "A black and white grainy photo of bald man eating lunch at a restaurant"
- "A police photo of the murder weapon"
- "A voyeuristic photo of a man wearing a blue suit and woman wearing a red dress, photogenic detailed faces, expressive eyes, in smoky back-room, 8k high resolution"

Rules:
- Evidence must support solving the puzzle using only the bundle.
- Do not copy the answer sentence verbatim into any evidence card.
- For comparison/constraint puzzles, make sure this card uses consistent fields/terms with the other evidence cards.
- Keep information consistent and accurate.

Return:
{
  "card_id": "…",
  "evidence_type": "logs",
  "card_contents": "…"
}
`.trim()
  };
}

