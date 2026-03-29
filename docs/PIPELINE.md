# Pipeline

This repo builds a murder-mystery card set through ordered agents. Each step mutates one shared `context` object and appends or validates cards.

## Flow
1. Story/world/characters establish setting and roster.
2. Murder/fortune/solution agents lock the hidden truth.
3. Trail and narrative agents shape suspicion across acts.
4. Item agent emits upstream evidence cards.
5. Puzzle agent emits deterministic 3-card bundles.
6. Bundle linker reuses earlier outcome cards for later bundles when act-safe.
7. Clue/game-card agents expand playable content.
8. Validators/final editor preserve structure and polish wording.

## Agent Flow
`story_blurb -> world_building -> characters -> murder_truth -> murder_validator -> fortune_truth -> fortune_validator -> solution_assembler -> breadcrumb_trail -> trail_review -> narrative_generator -> narrative_validator -> character_profile_refinement -> character_secret -> story_acts -> host_speech -> item -> puzzle -> bundle_linker -> clue -> ambiguity_balancer -> solvability_validator -> game_card -> roster_integrity_validator -> card_quality -> final_editor -> post_final_invariants -> bundle_integrity_validator`

## Card Model
- All player-facing content is a card: characters, secrets, acts, speeches, items, clues, puzzles, game cards.
- Puzzle bundles are the only structured subgraph inside the deck.

## Puzzle Bundle Contract
Each bundle must emit exactly:
1. `gate` card, visible
2. `puzzle` card, visible
3. `outcome` card, hidden until solve

Rules:
- `puzzle.required_card_ids` must include the gate card
- `puzzle.unlock_card_ids` must contain exactly the hidden outcome card
- gate cards must not carry requirements or unlocks
- outcome cards must not carry requirements or unlocks
- gate, puzzle, and outcome must share one act
- puzzle cards must have `solve_instructions` and one exact `solution`
- the `solution` must not appear in the puzzle card, gate card, or outcome card text
- each outcome card must be referenced by a later puzzle or belong to a terminal bundle

## Unlock Flow
Read gate -> solve puzzle -> reveal outcome -> later bundles may require that outcome card.

## Key Invariants
- No puzzle may require a hidden card.
- No hidden later-act outcome may unlock an earlier-act puzzle.
- Placeholder titles are rejected.
- Generic actionable gains are replaced with deterministic text.
- Bundle integrity is checked after final editing.

## Files
- [src/agents/puzzleAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/puzzleAgent.js)
- [src/agents/bundleLinkerAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/bundleLinkerAgent.js)
- [src/agents/cardQualityAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/cardQualityAgent.js)
- [src/pipeline/steps/index.js](/C:/wamp64/www/mmdc2-dev-builder/src/pipeline/steps/index.js)
