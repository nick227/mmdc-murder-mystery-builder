# Pipeline Summary

## Purpose

This document maps the current content pipeline in `mmdc2-dev-builder`:

- what content is generated
- which prompts, agents, and schemas are active
- what each stage writes into `context`
- which downstream stages consume that output
- which files are legacy or currently unused in the live step pipeline

This is intended as an operations map, not a design pitch.

## High-Level Flow

The current live pipeline is defined in [src/pipeline/steps/index.js](/C:/wamp64/www/mmdc2-dev-builder/src/pipeline/steps/index.js).

The content flow is:

1. Story framing
2. World data
3. Character roster
4. Core truth
5. Trail generation and review
6. Competing suspect narratives
7. Clue target selection
8. Story support cards
9. Puzzle bundles
10. Card validation and final editing
11. Final invariants and bundle integrity checks

The current puzzle model is:

- visible evidence cards
- one visible puzzle card
- one hidden solution card

The hidden solution is the puzzle answer and clue. The engine no longer derives suspect logic bundle-by-bundle.

## Live Step Order

These 29 steps are currently active:

1. `story_blurb_agent`
2. `world_building_agent`
3. `characters_builder_agent`
4. `core_truth_agent`
5. `core_truth_validator_agent`
6. `case_state_builder_agent`
7. `breadcrumb_trail_agent`
8. `trail_review_agent`
9. `narrative_generator_agent`
10. `narrative_validator_agent`
11. `character_profile_refinement_agent`
12. `character_secret_agent`
13. `story_acts_agent`
14. `host_speech_agent`
15. `item_agent`
16. `clue_target_agent`
17. `puzzle_agent`
18. `bundle_linker_agent`
19. `clue_agent`
20. `ambiguity_balancer_agent`
21. `solvability_validator_agent`
22. `game_card_agent`
23. `roster_integrity_validator_agent`
24. `card_quality_agent`
25. `final_editor_agent`
26. `evidence_canonicalizer_agent`
27. `bundle_structure_validator_agent`
28. `post_final_invariants_agent`
29. `bundle_integrity_validator_agent`

## Generated Content Types

The pipeline currently generates or modifies these main content classes:

- `storyBlurb`
- `world`
- seed cards for `person`, `location`, `item`
- `character` cards
- `coreTruth`
- `case_state`
- `trails`
- `narratives`
- `clue_targets`
- `secret` cards
- `story_act` cards
- `host_speech` cards
- additional `item` cards
- puzzle bundles: `clue` evidence cards, `puzzle` cards, `solution` cards
- extra `clue` cards from `clue_agent`
- `game_card` cards
- final edited card text
- `derived_facts` on non-bundle `clue` and `item` cards

## Context Objects That Matter Most

These are the most important `context` fields in current use:

- `context.storyBlurb`
- `context.world`
- `context.worldEntities`
- `context.cards`
- `context.coreTruth`
- `context.case_state`
- `context.trails`
- `context.trail_review`
- `context.narratives`
- `context.narrative_validation`
- `context.ambiguity_notes`
- `context.puzzle_bundles`
- `context.debug`

## Active Prompts Inventory

There are 25 prompt files under `src/prompts`. The table below separates actively used prompts from prompts that exist but are not currently part of the live step path.

### Active Prompts

| Prompt | Used By | Main Output | Downstream Consumers |
|---|---|---|---|
| `storyBlurbPrompt.js` | `storyBlurbAgent` | `storyBlurb`, entity lists | `worldBuildingAgent`, `coreTruthAgent`, `charactersBuilderAgent`, many later prompts |
| `worldBuildingPrompt.js` | `worldBuildingAgent` | `world`, world entities | `coreTruthAgent`, `breadcrumbTrailAgent`, later prompts |
| `charactersBuilderPrompt.js` | `charactersBuilderAgent` | character cards | `coreTruthAgent`, `characterSecretAgent`, `storyActsAgent`, `narrative*` |
| `coreTruthPrompt.js` | `coreTruthAgent` | `coreTruth` | `coreTruthValidatorAgent`, `caseStateBuilderAgent`, truth helpers |
| `coreTruthValidatorPrompt.js` | `coreTruthValidatorAgent` | pass/fail review of `coreTruth` | hard gate before case state |
| `breadcrumbTrailPrompt.js` | `breadcrumbTrailAgent` | `trails` | `trailReviewAgent`, many prompts |
| `trailReviewPrompt.js` | `trailReviewAgent` | reviewed `trails`, pass/fail | `ambiguityBalancerAgent`, later prompts |
| `narrativesPrompt.js` | `narrativeGeneratorAgent` | `narratives` object | `narrativeValidatorAgent`, `storyActsAgent`, `hostSpeechAgent`, `itemAgent`, `clueAgent`, `gameCardAgent`, `finalEditorAgent` |
| `narrativeValidatorPrompt.js` | `narrativeValidatorAgent` | pass/fail review of `narratives` | `ambiguityBalancerAgent` |
| `characterSecretsPrompt.js` | `characterSecretAgent` | secret cards | final card set |
| `storyActsPrompt.js` | `storyActsAgent` | story act cards | final card set |
| `hostSpeechPrompt.js` | `hostSpeechAgent` | host speech cards | final card set |
| `itemsPrompt.js` | `itemAgent` | additional item cards | `clueAgent`, final card set |
| `puzzlePrompt.js` | `puzzleAgent` | one puzzle bundle at a time | `bundleLinkerAgent`, `cardQualityAgent`, `bundleStructureValidatorAgent`, `bundleIntegrityValidatorAgent` |
| `cluesPrompt.js` | `clueAgent` | extra clue cards | final card set |
| `solvabilityValidatorPrompt.js` | `solvabilityValidatorAgent` | pass/fail solvability review | may trigger repair prompt |
| `solvabilityRepairPrompt.js` | `solvabilityValidatorAgent` | repaired cards | merged back into `context.cards` |
| `gameCardsPrompt.js` | `gameCardAgent` | game cards | final card set |
| `finalEditorPrompt.js` | `finalEditorAgent` | final rewritten card text | consumed immediately by final editor |

### Prompt Files Present But Not Used In Live Step Path

| Prompt | Status | Notes |
|---|---|---|
| `cardQualityPrompt.js` | unused in live pipeline | `cardQualityAgent` is now deterministic code, not LLM-driven |
| `characterProfilesPrompt.js` | unused in live pipeline | related to `characterProfileAgent`, which is not in live steps |
| `playerActivityPrompt.js` | unused in live pipeline | `playerActivityAgent` exists but is not active |
| `trailBalanceValidatorPrompt.js` | appears unused | no active step uses it |
| `trailsPrompt.js` | appears unused | breadcrumb trails use `breadcrumbTrailPrompt.js` instead |

## Agent Inventory

There are 35 files under `src/agents`. Not all are active.

### Active Agents

| Agent | Role | Writes / Changes | Key Inputs |
|---|---|---|---|
| `storyBlurbAgent.js` | generates story framing | `storyBlurb`, `storyEntities`, seed cards | initial context |
| `worldBuildingAgent.js` | generates world context | `world`, `worldEntities`, seed cards | `storyBlurb` |
| `charactersBuilderAgent.js` | generates playable characters | character cards | `storyBlurb`, `world`, seed people |
| `coreTruthAgent.js` | generates canonical truth | `coreTruth` | `storyBlurb`, characters, world |
| `coreTruthValidatorAgent.js` | validates truth | throws on failure | `coreTruth`, context |
| `caseStateBuilderAgent.js` | normalizes truth into engine state | `case_state` | `coreTruth`, cards |
| `breadcrumbTrailAgent.js` | generates breadcrumb trails | `trails` | truth helpers, world, locations |
| `trailReviewAgent.js` | reviews trails | `trail_review`, may replace `trails` | `storyBlurb`, `trails`, locations |
| `narrativeGeneratorAgent.js` | generates 3 suspect narratives | `narratives` | `storyBlurb`, solution, trails, characters |
| `narrativeValidatorAgent.js` | validates narratives | `narrative_validation` | `storyBlurb`, solution, trails, narratives, characters |
| `characterProfileRefinementAgent.js` | no-op placeholder | nothing | context |
| `characterSecretAgent.js` | generates secret cards | secret cards | `storyBlurb`, character cards |
| `storyActsAgent.js` | generates act cards | story_act cards | `storyBlurb`, narratives, characters, locations |
| `hostSpeechAgent.js` | generates host speech cards | host speech cards | `storyBlurb`, narratives, locations |
| `itemAgent.js` | generates additional items | item cards | `storyBlurb`, trails, narratives, characters, entities |
| `clueTargetAgent.js` | selects 4 clue facts for puzzle bundles | `clue_targets` | `storyBlurb`, `coreTruth`, characters, world |
| `puzzleAgent.js` | generates 4 puzzle bundles | `puzzle_bundles`, puzzle bundle cards | `storyBlurb`, `clue_targets` |
| `bundleLinkerAgent.js` | links bundle dependencies | rewrites puzzle card refs/ids | puzzle bundles in `context.cards` |
| `clueAgent.js` | generates extra clue cards | clue cards | `storyBlurb`, trails, narratives, cards |
| `ambiguityBalancerAgent.js` | creates editorial notes if needed | `ambiguity_notes` | trail and narrative validation results, cards |
| `solvabilityValidatorAgent.js` | validates and may repair cards | may rewrite `context.cards` | full card set |
| `gameCardAgent.js` | generates gameplay cards | game_card cards | `storyBlurb`, trails, playerCount, narratives |
| `rosterIntegrityValidatorAgent.js` | checks for off-roster capitalized names | warnings only | cards, character roster |
| `cardQualityAgent.js` | strips invalid cards and checks puzzle leaks | mutates `context.cards`, may throw | cards |
| `finalEditorAgent.js` | final wording normalization pass | rewrites `context.cards` text | cards, story, trails, narratives, ambiguity notes |
| `evidenceCanonicalizerAgent.js` | adds minimal fact extraction to evidence | `derived_facts` on clue/item cards | final visible card text |
| `bundleStructureValidatorAgent.js` | enforces bundle shape | throws on invalid bundles | cards with bundle ids |
| `postFinalInvariantsAgent.js` | final hard invariants | throws on invalid totals/placeholders | cards, puzzle bundles |
| `bundleIntegrityValidatorAgent.js` | validates bundle card ids and refs | throws or remaps bundle ids | cards, puzzle bundles |

### Agents Present But Not In Live Pipeline

| Agent | Status | Notes |
|---|---|---|
| `bundleDerivationAgent.js` | inactive legacy | left over from engine-side puzzle deduction experiment |
| `characterProfileAgent.js` | inactive | not in step list |
| `contentRatingAgent.js` | inactive stub | just returns context |
| `evidenceDefaults.js` | helper file, not a step | utility content |
| `evidenceValidator.js` | helper file, not a step | not in live steps |
| `playerActivityAgent.js` | inactive | has prompt but not scheduled |

## Schema Inventory

There are 13 schema files under `src/schemas`.

| Schema | Primary Use |
|---|---|
| `storyBlurbSchema.js` | `storyBlurbAgent` |
| `worldBuildingSchema.js` | `worldBuildingAgent` |
| `coreTruthSchema.js` | `coreTruthAgent` |
| `narrativesSchema.js` | `narrativeGeneratorAgent` |
| `clueTargetsSchema.js` | `clueTargetAgent` |
| `trailsSchema.js` | `breadcrumbTrailAgent`, `trailReviewAgent` |
| `cardsSchema.js` | `itemAgent`, `gameCardAgent` helpers |
| `simpleCardsSchema.js` | `storyActsAgent`, `hostSpeechAgent` |
| `clueSchema.js` | clue card shape helper |
| `cluesSchema.js` | `clueAgent` |
| `puzzleBundleSchema.js` | `puzzleAgent` |
| `reviewedCardsSchema.js` | repair/review helper |
| `finalCardsSchema.js` | final editor helper / related test shape |

## Detailed Downstream Feed Map

### 1. Story Blurb

Produced by:

- `storyBlurbAgent`

Writes:

- `context.storyBlurb`
- `context.storyEntities`
- seed `person`, `location`, `item` cards

Feeds:

- almost every downstream prompt

### 2. World Building

Produced by:

- `worldBuildingAgent`

Writes:

- `context.world`
- `context.worldEntities`
- more seed `person`, `location`, `item` cards

Feeds:

- `coreTruthAgent`
- `breadcrumbTrailAgent`
- world-aware generation later

### 3. Character Roster

Produced by:

- `charactersBuilderAgent`

Writes:

- `character` cards

Feeds:

- `coreTruthAgent`
- `characterSecretAgent`
- `narrativeGeneratorAgent`
- `narrativeValidatorAgent`
- `storyActsAgent`

### 4. Core Truth and Case State

Produced by:

- `coreTruthAgent`
- `coreTruthValidatorAgent`
- `caseStateBuilderAgent`

Writes:

- `context.coreTruth`
- `context.case_state`

Feeds:

- truth helpers
- bundle validation and later diagnostics

Note:

`case_state` is currently much more important for engine sanity than for puzzle generation.

### 5. Breadcrumb Trails

Produced by:

- `breadcrumbTrailAgent`
- `trailReviewAgent`

Writes:

- `context.trails`
- `context.trail_review`

Feeds:

- `narrativeGeneratorAgent`
- `itemAgent`
- `clueAgent`
- `gameCardAgent`
- `finalEditorAgent`

### 6. Suspect Narratives

Produced by:

- `narrativeGeneratorAgent`
- `narrativeValidatorAgent`

Writes:

- `context.narratives`
- `context.narrative_validation`

Feeds:

- `storyActsAgent`
- `hostSpeechAgent`
- `itemAgent`
- `clueAgent`
- `gameCardAgent`
- `finalEditorAgent`
- `ambiguityBalancerAgent`

Important:

`context.narratives` is not an array in practice. It is an object shape produced from `narrativesSchema`, typically keyed as competing narrative branches. Any prompt treating it as an array is likely wrong.

### 7. Clue Targets

Produced by:

- `clueTargetAgent`

Writes:

- `context.clue_targets`

Feeds:

- `puzzleAgent`

Purpose:

- chooses the concrete facts each puzzle bundle should reveal
- separates "what clue matters" from "how the puzzle reveals it"
- includes or derives `act`
- includes or derives `puzzle_type_hint`
- includes or derives `difficulty_hint`
- dedupes overlapping clue facts before puzzle generation

### 8. Support Content Cards

Produced by:

- `characterSecretAgent`
- `storyActsAgent`
- `hostSpeechAgent`
- `itemAgent`
- `clueAgent`
- `gameCardAgent`

Writes:

- cards directly into `context.cards`

Feeds:

- final total card set
- final editor
- solvability validator
- integrity validators

### 9. Puzzle Bundles

Produced by:

- `puzzleAgent`

Writes:

- 4 bundle groups into `context.cards`
- `context.puzzle_bundles`

Bundle contract:

- 2 to 4 visible evidence cards
- 1 visible puzzle card
- 1 hidden solution card

Puzzle generation is now target-driven:

- `clueTargetAgent` chooses the fact
- `clueTargetAgent` also chooses or derives act, difficulty, and preferred puzzle type
- `puzzleAgent` builds the mechanics and evidence around that fact
- the hidden solution card is locked to the selected target fact at emission time

Then modified by:

- `bundleLinkerAgent`
- `cardQualityAgent`
- `finalEditorAgent`
- `evidenceCanonicalizerAgent`
- `bundleStructureValidatorAgent`
- `bundleIntegrityValidatorAgent`

Important:

- the hidden solution clue is locked to the selected clue target fact at emission time
- bundle size is now tied to target difficulty
- `finalEditorAgent` now preserves bundle card text instead of rewriting puzzle bundle meaning
- `evidenceCanonicalizerAgent` skips bundle cards and annotates only non-bundle evidence

### 10. Ambiguity and Solvability

Produced by:

- `ambiguityBalancerAgent`
- `solvabilityValidatorAgent`

Writes:

- `context.ambiguity_notes`
- validation results and warnings

Feeds:

- `finalEditorAgent`

Note:

This is still one of the heavier remaining areas. `solvabilityValidatorAgent` will skip repair when bundle cards exist, but it can still rewrite non-bundle card sets in other scenarios.

### 11. Final Edit and Validation

Produced by:

- `cardQualityAgent`
- `finalEditorAgent`
- `evidenceCanonicalizerAgent`
- `bundleStructureValidatorAgent`
- `postFinalInvariantsAgent`
- `bundleIntegrityValidatorAgent`

Writes:

- filtered/finalized `context.cards`
- `derived_facts` on non-bundle evidence cards
- warnings in `context.debug.warning_log`

These are the last gates before result output.

## What The Puzzle System Generates Today

The puzzle system currently generates:

- local evidence cards tailored to each puzzle
- one puzzle question
- one hidden answer clue

The clue answer is selected first by `clueTargetAgent`, then turned into a puzzle bundle by `puzzleAgent`.

This is the correct simplified gameplay model:

- evidence supports puzzle
- puzzle unlocks answer clue
- player uses revealed clues across bundles to solve the mystery

The engine is now mainly enforcing:

- shape
- visibility
- bundle references
- leak prevention

It is no longer supposed to solve the mystery itself.

## Complexity Hotspots

These are the parts that still look heavier than necessary.

### 1. Late-Stage Rewriting Still Exists

Puzzle bundles are still exposed to several late global passes:

- `ambiguityBalancerAgent`
- `solvabilityValidatorAgent`
- `finalEditorAgent`
- `evidenceCanonicalizerAgent`

The new boundaries are tighter now:

- `ambiguityBalancerAgent`: notes only
- `solvabilityValidatorAgent`: validates but skips repair when bundle cards exist
- `finalEditorAgent`: preserves bundle cards and only normalizes non-bundle cards
- `evidenceCanonicalizerAgent`: annotate only

This greatly reduces drift, though the pipeline still contains late global stages.

### 2. Narratives Are Spread Too Widely

`context.narratives` feeds many later prompts. This creates coupling between suspect-lens writing and systems that may only need factual context.

Likely simplification targets:

- `itemsPrompt.js`
- `finalEditorPrompt.js`
- possibly `cluesPrompt.js`

### 3. Solvability Repair Is Still Powerful

`solvabilityValidatorAgent` can rewrite the full card set after generation. This is useful for rescue, but it also makes the pipeline harder to reason about.

### 4. Legacy Files Still Exist

The repo still contains inactive derivation-era and optional files:

- `bundleDerivationAgent.js`
- `characterProfileAgent.js`
- `playerActivityAgent.js`
- `cardQualityPrompt.js`
- `trailBalanceValidatorPrompt.js`
- `trailsPrompt.js`

These do not necessarily hurt runtime, but they increase mental overhead.

## Recommended Mental Model

If you are trying to reason about the current system, use this compressed model:

### Canonical Story Layer

- `storyBlurb`
- `world`
- `characters`
- `coreTruth`
- `case_state`

### Investigative Framing Layer

- `trails`
- `narratives`
- `clue_targets`

### Playable Content Layer

- secrets
- story acts
- host speech
- items
- extra clues
- game cards
- puzzle bundles

### Post-Generation Control Layer

- ambiguity notes
- solvability repair
- card quality
- final editor
- evidence canonicalization
- bundle validators
- final invariants

## Counts

Current repo inventory:

- 25 prompt files
- 35 agent files
- 13 schema files

Current live step path:

- 29 active steps

Current active puzzle contract:

- evidence + puzzle + hidden solution clue

## Practical “What Feeds What” Short Version

- story/world -> characters -> core truth
- core truth -> case state
- truth/world/locations -> trails
- trails + solution + characters -> narratives
- core truth + world + characters -> clue targets
- narratives + story context -> acts, host speech, items, extra clues, game cards
- clue targets + story context -> puzzles
- all cards -> ambiguity/solvability -> final edit
- final edited cards -> evidence canonicalization -> structure/invariant/integrity checks

## Bottom Line

The pipeline is currently doing two different jobs:

1. generating the story world and suspect framing
2. generating the playable card set

That is manageable.

The main remaining over-complexity is not the number of files by itself. It is:

- late-stage global stages still touching a shared `context.cards`
- narratives feeding too many downstream prompts
- solvability repair rewriting generated content late
- inactive legacy files making the system look larger than the live path actually is

If further simplification is needed, the cleanest next pass is to reduce downstream reliance on `context.narratives` and keep puzzle generation focused on local bundle content only.
