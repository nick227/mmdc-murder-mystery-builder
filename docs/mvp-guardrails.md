# MVP Guardrails

This document defines the current non-negotiable rules for the playable mystery MVP.

## Core Principle

The system should generate playable games with coherent clues.

Do not add new reasoning layers, derivation engines, or semantic overhead unless a concrete gameplay failure requires it.

## Puzzle Bundle Model

Each puzzle bundle is a local micro-system:

- visible evidence cards
- one visible puzzle card
- one hidden clue card

The hidden clue card is the puzzle answer.

The bundle should work as:

`evidence -> puzzle -> hidden clue`

Not:

`evidence -> engine deduction -> suspect math -> final conclusion`

## Fact-First Puzzle Rule

Puzzle relevance must be selected before puzzle mechanics.

Current model:

`coreTruth -> clue_targets -> puzzle bundles`

Rules:

- `clueTargetAgent` chooses concrete facts
- `puzzleAgent` builds the puzzle around the chosen fact
- the hidden clue is locked to the selected clue target at emission

Do not let `puzzleAgent` invent the clue target on its own.

## Clue Target Invariant

Once `clue_targets` are selected, they are frozen.

Allowed:

- selecting clue targets
- assigning one clue target to one bundle
- using the selected clue target to build the puzzle and hidden clue

Not allowed:

- rewriting clue target text
- merging clue targets
- splitting clue targets
- reassigning a clue target to a different bundle after selection

Model:

`clue_targets -> frozen -> puzzleAgent`

## Bundle Freezing

Once a puzzle bundle is generated, its meaning should remain frozen.

Allowed after generation:

- ID linking
- structural validation
- visibility validation
- leak checks

Not allowed after generation:

- rewriting bundle clue meaning
- changing puzzle answer
- changing evidence logic
- adding deduction commentary

## Bundle Isolation Rule

Each bundle must remain independently solvable as a local system.

Allowed:

- local evidence comparison
- local cross-reference
- local decoding
- unlock gating between bundles

Not allowed:

- bundle A required to understand bundle B puzzle text
- chained deduction inside the puzzle itself
- cross-bundle reasoning inside a single puzzle

Dependencies may gate unlocks, not puzzle logic.

## Late-Stage Agents

### `solvabilityValidatorAgent`

Allowed:

- validate bundle solvability
- warn or fail

Not allowed:

- repair or rewrite bundle cards

Current rule:

- if bundle cards exist, skip repair

### `finalEditorAgent`

Allowed:

- normalize wording for non-bundle cards

Not allowed:

- rewrite bundle cards
- change bundle clue meaning
- change puzzle mechanics

Current rule:

- bundle cards are preserved exactly

### `evidenceCanonicalizerAgent`

Allowed:

- annotate non-bundle evidence cards

Not allowed:

- alter bundle evidence
- derive post-hoc facts for bundle cards

Current rule:

- bundle cards are skipped

## Bundle Contract

Each bundle must contain:

- 1 puzzle
- 1 hidden clue
- visible evidence cards

Evidence count is tied to difficulty:

- `easy`: 2 evidence cards
- `medium`: 3 evidence cards
- `hard`: minimum 3, prefer 4 evidence cards

The engine should enforce structure only.

## Puzzle Determinism Rule

The puzzle must resolve only from the visible evidence inside its own bundle.

Allowed:

- bundle-local cross-reference
- bundle-local comparison
- bundle-local elimination
- bundle-local decoding

Not allowed:

- requiring outside story knowledge
- requiring narrative reading
- requiring other bundles to interpret the puzzle
- relying on implicit assumptions not stated in the evidence

The puzzle answer must come from bundle-local evidence only.

## Single-Answer Rule

Each puzzle must have exactly one unambiguous answer.

Not allowed:

- multiple valid answers
- interpretation-based answers
- open-ended questions

Each puzzle must resolve to:

- one fact
- one statement
- one hidden clue

## Hidden Clue Rules

The hidden clue must:

- be a single concrete fact
- be the direct answer to the puzzle
- be grounded in the bundle evidence
- avoid commentary wording
- avoid vague summary language

Bad:

- "This suggests Marcus is suspicious."
- "Only one suspect remains."
- "This points toward the killer."

Good:

- "Marcus Vale's badge was used at the lab door at 9:14 PM."
- "The lighthouse door was locked from inside."
- "The skiff left the marina at 9:12 PM."

## Linker Rules

`bundleLinkerAgent` may only add non-breaking dependencies.

Allowed:

- append required card ids for bundle progression

Not allowed:

- rewrite bundle content
- rewrite clue text
- create impossible act ordering
- create self-dependencies

Preferred dependency pattern:

- chain progression

Avoid:

- star-graph dependency patterns
- later-act hidden unlocks required by earlier-act puzzles

## Narrative Coupling

Puzzle generation should not depend on suspect prose for relevance.

Allowed puzzle inputs:

- `clue_targets`
- puzzle type
- light story flavor

Avoid using:

- suspect narrative prose
- ambiguity notes
- downstream editorial context

## Engine Scope

The engine should enforce:

- bundle shape
- bundle visibility
- dependency integrity
- leak prevention
- final invariant checks

The engine should not:

- solve the mystery
- eliminate suspects
- score suspects
- derive final culprit logic bundle-by-bundle

The player is the reasoning engine.

## Placeholder and Fallback Rules

Do not allow:

- placeholder titles
- generic clue text
- generic fallback solution language

Bad:

- `Puzzle Bundle 3 Card 4`
- `A concrete clue revealed after the puzzle is solved.`
- `Reveal the hidden clue in this bundle.`

If generation cannot produce a concrete bundle, fail fast instead of shipping filler.

## What To Optimize For

Prefer:

- coherent clues
- stable puzzle payoff
- local bundle solvability
- concrete evidence
- readable clue chain across acts

Acceptable MVP risk:

- some redundancy
- occasional clue overlap
- imperfect elegance

Unacceptable MVP risk:

- incoherent clue chain
- rewritten bundle logic
- puzzle answer drift
- impossible dependency ordering
- filler clues

## Change Policy

Before adding a new agent, schema, or validator rule, ask:

1. Does this fix a real gameplay failure?
2. Can this be solved by tightening prompt output instead?
3. Will this increase global coupling?
4. Will this rewrite bundle meaning after generation?

If the answer to 4 is yes, do not add it.
