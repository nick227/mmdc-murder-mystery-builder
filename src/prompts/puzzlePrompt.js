export function buildPuzzlePrompt({ storyBlurb, trails, narratives, upstreamCards, puzzleCount }) {
  return {
    system: `
You design puzzle bundles for a social deduction murder mystery.

Each bundle is a mini evidence package that advances the investigation.

Hard rules:
- each bundle must emit exactly 1 puzzle card
- each bundle must emit at least 2 new non-puzzle cards
- bundles may reference upstream cards that already exist
- bundles may emit hidden unlock cards that only appear after solve
- every bundle must state one actionable_gain
- no bundle may reveal the full solution alone

Puzzle quality standard:
- challenging: players must compare, infer, decode, combine, or notice something
- solvable: the answer must come from required cards already available in the bundle or from listed upstream cards
- rewarding: solving must unlock major useful information

Difficulty to evidence strength:
- easy -> weak/supporting information
- medium -> narrowing information
- hard -> strong but not decisive information

Never unlock decisive evidence.
`.trim(),

    user: `
Story:
${storyBlurb}

Reviewed trails:
${JSON.stringify(trails, null, 2)}

Narratives:
${JSON.stringify(narratives, null, 2)}

Available upstream cards you may reference by card_id:
${JSON.stringify(upstreamCards || [], null, 2)}

Create exactly ${puzzleCount} puzzle bundles.

Bundle rules:
- preferred puzzle types: cross_reference, cipher, item_combination, timeline, elimination
- cross_reference bundles should usually require 3+ cards and concentrated comparison
- cipher bundles should solve faster and unlock concrete progress
- item_combination bundles should require players to visibly combine multiple assets
- medium and hard puzzles must reference at least one previously emitted upstream card when available; this helps create investigation chains
- if no suitable upstream card exists for a bundle, create the bundle normally using local cards only
- required_card_refs handles both visibility and solving: if those cards exist, the puzzle is available and solvable
- required_card_refs may include local card_ref values from this bundle or upstream card_id values from the provided upstream cards
- unlock_card_refs should point only to local bundle card_ref values that stay hidden until solved
- hidden unlock cards should usually be clue cards or final interpretation cards
- across the full set of puzzles, at least 1-2 medium or hard puzzles must require a card that is emitted or unlocked by a previous puzzle, when suitable earlier puzzle cards exist
- when generating later puzzles, look for opportunities to reuse cards from earlier bundles and prefer reusing cards that unlock strong or specific evidence
- every actionable_gain must answer: "What new actionable information do players gain?"
- actionable_gain must be concrete and state-changing (use verbs like: narrows, eliminates, contradicts, links, breaks, proves)
- do not output decorative filler cards

Unlock card quality rules (avoid redundant_unlock failures):
- unlock cards must introduce NEW information not already stated by required cards or upstream cards
- do not paraphrase or restate required cards as unlock cards
- unlock card_contents should include at least one concrete discriminator such as a time, location, initials, serial/lot number, or access restriction
- unlock cards may narrow suspicion but must not reveal the full solution alone

Return exactly this JSON shape:
{
  "bundles": [
    {
      "puzzle_type": "cross_reference",
      "difficulty": "hard",
      "actionable_gain": "",
      "solution_summary": "",
      "required_card_refs": [],
      "unlock_card_refs": [],
      "cards": [
        {
          "card_ref": "puzzle_main",
          "card_type": "puzzle",
          "card_title": "",
          "card_contents": "",
          "act": 2,
          "hidden_until_solved": false
        },
        {
          "card_ref": "asset_a",
          "card_type": "item",
          "card_title": "",
          "card_contents": "",
          "act": 2,
          "hidden_until_solved": false
        },
        {
          "card_ref": "unlock_a",
          "card_type": "clue",
          "card_title": "",
          "card_contents": "",
          "act": 2,
          "hidden_until_solved": true
        }
      ]
    }
  ]
}
`.trim()
  };
}
