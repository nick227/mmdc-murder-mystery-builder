# MMDC MMD Pipeline Analysis (Current Flow + Context)

This document traces the **current implemented pipeline** (as executed by `src/queue/Worker.js` + `src/pipeline/steps/index.js`) with emphasis on:

- what each step **reads from** and **writes to** the shared `context`
- where context is **inconsistent / missing / mis-typed**
- issues that will reduce **coherence** and **playability**
- concrete improvements to make generated mysteries more consistent and solvable

## Source of truth for the execution order

The live step order is defined in `src/pipeline/steps/index.js` and executed sequentially by `src/queue/Worker.js`.

Current step list:

1. `story_blurb_agent`
2. `world_building_agent`
3. `characters_builder_agent`
4. `murder_truth_agent`
5. `murder_validator_agent`
6. `fortune_truth_agent`
7. `fortune_validator_agent`
8. `solution_assembler_agent`
9. `breadcrumb_trail_agent`
10. `trail_review_agent`
11. `narrative_generator_agent`
12. `narrative_validator_agent`
13. `character_secret_agent`
14. `story_acts_agent`
15. `host_speech_agent`
16. `item_agent`
17. `puzzle_agent`
18. `clue_agent`
19. `ambiguity_balancer_agent`
20. `solvability_validator_agent`
21. `game_card_agent`
22. `card_quality_agent`
23. `final_editor_agent`

## Global context model (as used today)

`src/queue/Worker.js` initializes (or ensures) a baseline context:

- `runId: string | null`
- `runDir: string | null`
- `userPrompt: string`
- `playerCount: number`
- `cards: []`

`src/pipeline/validate.js` validates only these baseline fields + `cards[]` shape (loosely). Most pipeline-specific fields are **not validated**.

### Key derived fields used across steps (observed)

- `story_blurb: string`
- `world: string` (world building step returns plain text)
- `murder_truth: string`
- `fortune_truth: string`
- `solution: { killer, method, location, motive }` (structured hidden truth; canonical truth source)
- `trails: any[]` (breadcrumb trail JSON)
- `narratives: object` (expects `{ a, b, c, true_narrative }` plus optional enrichment like `story_paths`)
- `puzzle_bundles: object[]` (optional; when present, references cards emitted by puzzle bundles)
- `ambiguity_notes: string`
- `cards: { card_type, card_title, card_contents, act? }[]` (plus occasional extra fields)

## Step-by-step: inputs, outputs, and context coupling

The most important aspect for coherence is whether each step receives the information it assumes exists, and whether later steps can reliably use what earlier steps produced.

### 1) `story_blurb_agent`

- **Reads**: `context` (via `buildStoryBlurbPrompt(context)`; likely uses `userPrompt` / `playerCount`)
- **Writes**: `context.story_blurb = string`
- **Notes**: This is the public-facing seed. Everything else should stay consistent with it.

### 2) `world_building_agent`

- **Reads**: `context.story_blurb`
- **Writes**: `context.world = string` (plain text)
- **Issue risk**: Several prompts treat `world` like a JSON object (or stringify it). Today it’s a string.

### 3) `characters_builder_agent`

- **Reads**:
  - `context.story_blurb`
  - `context.player_count` (snake_case)
- **Writes**:
  - pushes `character` cards into `context.cards` (seed cards; `card_id` assigned)
  - calls `characterProfileAgent(childContext)` per character seed **but does not merge child results back**
- **Major issues**:
  - **Wrong player count key**: pipeline uses `playerCount`, but this step reads `player_count`. This will produce prompts like “generate exactly undefined characters”, causing character count drift.
  - **Child context discarding**: `characterProfileAgent(childContext)` updates `childContext.cards`, not `context.cards`. Because `childContext` is a copy, those cards are effectively lost unless `characterProfileAgent` has side effects elsewhere (it doesn’t in current code).

**Practical implication**: profile generation may still be discarded (child context), but the canonical character roster exists as `context.cards` of type `character`.

### 4) `murder_truth_agent`

- **Reads (prompt)**:
  - `context.story_blurb`
  - playable character cards (roster derived from `context.cards`)
  - `context.world` (passed as prose)
- **Writes**: `context.murder_truth = string`
- **Major issues**:
  - Remaining risk is **prompt-level drift** (truth prose not automatically guaranteed to match later `solution` extraction).

### 5) `murder_validator_agent`

- **Reads**: whatever `buildMurderValidatorPrompt(context)` uses (not traced here)
- **Behavior**: throws if response doesn’t match `/pass|ok|valid/i`
- **Risk**: “string contains pass” validation is brittle. It can false-pass on “not valid / didn’t pass” and false-fail on structured output.

### 6) `fortune_truth_agent` + 7) `fortune_validator_agent`

- Similar structure to murder truth + validator.

### 8) `solution_assembler_agent`

- **Reads**: `story_blurb`, `murder_truth`, `fortune_truth`, `world`, playable character roster
- **Writes**: `context.solution = { killer, method, location, motive }`
- **Notes**: `context.solution` is the **single source of truth** for downstream “who did it” alignment.

### 9) `breadcrumb_trail_agent`

- **Reads**: `murder_truth`, `fortune_truth`, `world`, and `solution`
- **Writes**: `context.trails = result.trails || result.steps || []`
- **Notes**: Trails are now explicitly **solution-grounded** and have intended roles (red-herring lean / killer-aligned / ambiguous).

### 10) `trail_review_agent`

- **Reads**: `storyBlurb`, `solution`, `trails`
- **Writes**: may rewrite `context.trails` (same shape)
- **Notes**: The review step should preserve the intended three-trail roles and order.

### 11) `narrative_generator_agent`

- **Reads**: `story_blurb`, `solution`, `trails`, playable characters, `playerCount`
- **Writes**: `context.narratives`
- **Notes**: This creates the competing suspect arcs; it’s central to “playable ambiguity”.

### 12) `narrative_validator_agent`

- **Reads**: `storyBlurb`, `solution`, `trails`, `narratives`, playable characters
- **Writes**: validator output only (PASS/FAIL behavior depends on agent implementation)

### 13) `character_secret_agent`

- **Reads**: playable character cards from `context.cards`
- **Writes**: pushes `secret` cards
- **Current behavior**: secrets are **id-linked** via `linked_character_id` (stable; not title-based)

### 13) `story_acts_agent`

- **Reads**: `story_blurb`, `narratives`, `characters` (expects `context.characters`)
- **Writes**: pushes `story_act` cards
- **Major issue**: no step populates `context.characters`.

### 14) `host_speech_agent`

- **Reads**: `story_blurb`, `narratives`
- **Writes**: pushes `host_speech` cards
- **Notes**: Relatively self-contained (does not require “truth”), but will suffer if narratives are incoherent.

### 16) `item_agent`, 17) `puzzle_agent`, 18) `clue_agent`

- **Read**: mainly `story_blurb`, `solution`, `trails`, `narratives` (plus upstream cards for puzzle bundles)
- **Write**: pushes `item`, `puzzle`, and `clue` cards
- **Notes (clues)**: clue cards are tagged with `trail_role` (`red_herring|ambiguous|killer_aligned`) and `act` is derived from it.

### Character data: avoid “two sources of truth”

Right now, the pipeline *attempts* to use:
- `context.cards` (for anything “card-like”), and also
- `context.characters` / `context.character_profiles` in a few places (but those are not populated in the current pipeline).

This is not only a “future fragility” concern: **today** the pipeline already produces character data in one structure (`context.cards`) but consumes it in another (`context.character_profiles`) in `character_secret_agent`, which makes that step unreliable.

If you move toward an architecture where `characters_builder_agent` produces `context.characters` (seeds) *and* `characterProfileAgent` produces `context.cards` (profiles), you will also have a **dual-source-of-truth** problem unless you enforce a mapping.

**Best practice recommendation**:
- Pick **one canonical representation** for “character identity” (usually a stable `character_id`)
- Allow multiple views (seed vs profile vs card) but require they all carry the same `character_id`
- Do not join/link by `card_title` (titles are presentation, not identity)

### 18) `ambiguity_balancer_agent`

- **Reads**: `story_blurb`, `murder_truth`, `cards[]`
- **Writes**: `ambiguity_notes` only
- **Major issue**: It currently does **not** apply edits to cards; it only produces “editorial guidance”. If the goal is to actually rebalance ambiguity, this step is inert with respect to outputs.

### 19) `solvability_validator_agent`

- **Reads**: `murder_truth` and `cards`
- **Writes**: may rewrite `context.cards` via a “repair” pass, preserving array order/size
- **Notes**:
  - This is the only step that programmatically enforces “playable / deducible” constraints across the final card set.
  - It does not include `trails`, `narratives`, or `world` in the validation prompt, so it can fix “card-level contradictions” but not deeper “story vs card vs narrative” misalignment.

### 21) `game_card_agent`

- **Reads**: `story_blurb`, `trails`, `playerCount`, `narratives`
- **Writes**: pushes `game_card` cards

### 22) `card_quality_agent`

- **Reads/Writes**: filters invalid cards, dedupes exact duplicates by `(type,title,contents)` case-insensitive
- **Notes**: Helpful hygiene, but does not enforce narrative coherence.

### 23) `final_editor_agent`

- **Reads** (prompt builder expects): `{ storyBlurb, trails, narratives, misleadingAssumption, cards }`
- **Agent passes**: entire `context`
- **Major issue**: prompt builder destructures `storyBlurb`, but context stores `story_blurb`. So `Story blurb:` will likely be blank in the final editor prompt.
- **Critical issue**: `finalEditorPrompt` says “Return … plain text”, but `finalEditorAgent` calls `callJson` with `finalCardsSchema` and expects `result.cards`. This is a hard mismatch between **expected format** and **API call**.

## Coherence and playability issues (highest impact)

### 1) Context key drift (`playerCount` vs `player_count`, `story_blurb` vs `storyBlurb`)

This is the single biggest structural issue. Multiple steps are effectively running with missing inputs.

**Gameplay impact**:
- wrong number of characters/cards
- “truth” steps don’t bind to actual characters
- final editor doesn’t see the actual premise

### 2) “Truth” is not reliably carried as a structured object

You currently generate:
- `murder_truth: string`
- `fortune_truth: string`

…but review/validator prompts expect something more like:
- `solutions: { killer, motive, method, timeline, ... }`

**Gameplay impact**:
- later validators can’t enforce “killer alignment”
- trails/narratives can drift away from the true solution

### 3) Several steps refer to missing fields (`context.characters`, `context.character_profiles`, `context.profiles`)

**Gameplay impact**:
- character secrets often empty
- story acts / clues lose character grounding
- murder truth may not properly constrain opportunity to a single suspect

### 4) Review/validator steps are miswired (prompt signatures vs provided inputs)

`trail_review_agent`, `narrative_validator_agent`, and `final_editor_agent` are especially affected.

**Gameplay impact**:
- “quality gates” can’t enforce constraints they were designed for
- pipeline may pass when it shouldn’t, or fail unpredictably

### 5) Ambiguity balancing does not alter outputs

Right now it emits `ambiguity_notes` but never applies edits to cards/narratives/trails.

**Gameplay impact**:
- early-game over-certainty remains unfixed
- the intended pacing control is not realized

## Targeted improvements (to make stories coherent + playable)

These are ordered by impact-to-effort.

### A) Standardize context keys (one canonical shape)

Pick one convention and enforce it:

- `storyBlurb` (or `story_blurb`) everywhere
- `playerCount` everywhere
- `world` as either **string** everywhere or a structured object everywhere

Then add a single “normalization” step early (or in `ensureJobContext`) that:
- maps legacy keys to canonical keys
- deletes/avoids writing the legacy variants

### B) Introduce a structured `solution` object (single ground truth)

Replace (or supplement) `murder_truth` / `fortune_truth` strings with:

- `solution: { killerName, method, location, motive, timeline, keyEvidence, ... }`

Then update:
- trail creation/review
- narrative generator/validator
- solvability validator prompt

to use this `solution` object explicitly.

### C) Fix character pipeline so “characters exist” as data, not just cards

Decide on one of:

- `context.characters: Character[]` (structured)
- `context.cards` filtered to type `character` (derived on demand)

Then ensure:
- murder truth selects from actual character names
- secrets are generated from the same character set
- clue/item/puzzle steps can reference characters consistently

### D) Make validators actually validate (schema outputs, not regex)

For validator agents:
- return JSON `{ pass: boolean, problems: string[] }`
- parse and enforce it

This makes failures actionable and prevents false passes.

### E) Ambiguity balancing should apply repairs, not only notes

Either:
- convert `ambiguity_balancer_agent` into an editor that returns rewritten `cards` (like the solvability repair step), or
- make it produce explicit diff-style instructions that another step applies deterministically.

### F) Align `final_editor_agent` prompt with call type

Pick one:
- **Option 1**: final editor returns JSON `{"cards":[...]}` and you keep `callJson`
- **Option 2**: final editor returns plain text and you store it as `context.final_edit_notes`

Right now it tries to do both.

## Documentation drift to address

`docs/SYSTEM_DOCUMENTATION.md` and `README.md` describe a pipeline with `solution_agent`, `character_profile_agent`, and “truth-aware vs truth-blind” separation that doesn’t match the currently executed `steps` list.

Recommendation:
- treat `src/pipeline/steps/index.js` as the only authoritative pipeline list
- periodically regenerate docs from the step list (or update docs when steps change)

## Quick “sanity checklist” for a playable run (what the pipeline should guarantee)

- `playerCount` characters exist and are consistent across all references
- one killer is uniquely capable (opportunity + access + timing)
- at least one hard contradiction exists that forces player reasoning
- cards do not directly reveal the killer in Act 1–2
- Act pacing is respected (intro → pressure → commitment)
- breadcrumbs → narratives → cards all stay consistent with the same ground truth

