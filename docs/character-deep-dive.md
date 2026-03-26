# Character Deep Dive: Builder + Profiles + Secrets

This document traces the current **character-building pipeline flow**, focusing on:

- what we create (cards + fields)
- what context each step receives
- where the profile-generation flow currently does (and does not) affect the final run output
- concrete, minimal proposals to improve quality and reduce drift

## Where this runs in the pipeline

From `src/pipeline/steps/index.js`, character-relevant steps appear as:

1. `characters_builder_agent` (creates playable character cards)
2. Later: `narrative_generator_agent` / `narrative_validator_agent` (feeds into character bias in profile prompt)
3. `character_secret_agent` (adds secret cards linked to characters)

## Canonical data model: everything is `context.cards`

The system treats `context.cards` as the canonical store. `pushCards()` assigns a stable `card_id` and persists extra metadata fields when present.

### Character cards (type = `character`)

Produced by `characters_builder_agent` (seed bio) and potentially also by `characterProfileAgent` (profile cards).

Current fields (common):
- `card_id: string`
- `card_type: "character"`
- `card_title: string` (character name)
- `card_contents: string` (role/bio/profile text)
- `act: 1|2|3` (defaults if not provided)

### Secret cards (type = `secret`)

Produced by `character_secret_agent`.

Fields:
- `card_id: string`
- `card_type: "secret"`
- `card_title: string`
- `card_contents: string`
- `linked_character_id: string` (**stable linkage** to the target character card)

## Current flow: builder → (attempted profiles) → secrets

### 1) `characters_builder_agent` (seed characters)

**Files:** `src/agents/charactersBuilderAgent.js`, `src/prompts/charactersBuilderPrompt.js`

**Inputs (context → prompt):**
- Story: `getStoryBlurb(context)` (reads `context.storyBlurb` or `context.story_blurb`)
- Player count: `context.playerCount`

**Prompt contract:**
- “generate exactly playerCount characters”
- returns JSON `{ cards: [{ card_title, card_contents }] }`

**Outputs (writes to context):**
- Converts result to entries with `card_type: 'character'`, then calls:
  - `pushCards(context, 'character', cards)`
- `pushCards()` assigns `card_id` for each character card.

**Validation:**
- Confirms `getCharacterCards(context.cards).length === playerCount` after push.

**Profile generation attempt (important nuance):**
- For each generated seed card, it calls `characterProfileAgent(childContext)` where `childContext` is a shallow clone:
  - `cards: [...(context.cards || [])]`
  - `character_seed: card`
- This call does **not** merge its results back into the parent `context`.

**Practical effect today:**
- The run output reliably contains **seed character cards**.
- Any “profile” cards created by `characterProfileAgent` inside `childContext` are **discarded** unless some other mechanism merges them later (none does in current flow).

### 2) `characterProfileAgent` (profiles)

**Files:** `src/agents/characterProfileAgent.js`, `src/prompts/characterProfilesPrompt.js`

**How it is currently called:**
- Called from `characters_builder_agent` *before* narratives and trails exist in early pipeline.

**Inputs it expects:**
- `storyBlurb: context.story_blurb`
- `trails: context.trails`
- `narratives: context.narratives`
- `playerCount`

**Prompt behavior:**
- If narratives are missing, it falls back to a minimal “Write character profiles” prompt.
- If narratives exist, it assigns each character a “narrative bias” and generates exactly `playerCount` profile cards.

**Output behavior:**
- Pushes returned cards into `context.cards` as type `character` (act 1).

**Current issues:**
- **Ordering mismatch:** profiles are triggered before the data that makes them best (`narratives`, `trails`).
- **Not used:** results are pushed into `childContext.cards`, not the main `context.cards`, so they do not survive.
- **Duplication risk if fixed naïvely:** if you merge profile cards back without replacing/updating seeds, you’ll end with 2× character cards (seed + profile) unless you implement replacement.

### 3) `character_secret_agent` (secrets)

**Files:** `src/agents/characterSecretAgent.js`, `src/prompts/characterSecretsPrompt.js`

**Inputs (context → prompt):**
- Story blurb via `getStoryBlurb(context)`
- Character card: `card_title` and `card_contents` from the character card itself

**Character selection:**
- `getCharacterCards(context.cards)` filtered to those with non-empty titles.

**Linking model:**
- Requires each target character to have `card_id` (throws if missing).
- Emits secrets with `linked_character_id: character.card_id`.

**Practical effect today:**
- Secrets generation is reliable and stable because it reads canonical `context.cards` and links by id.

## Context provided (by step)

### Character builder prompt context
- `storyBlurb`
- `playerCount`

### Character profiles prompt context (ideal vs actual)

Ideal (when used well):
- `storyBlurb`
- `trails`
- `narratives`
- `playerCount`

Actual in current pipeline invocation:
- Called before narratives/trails exist, so it frequently runs in fallback mode and its output is discarded.

### Character secrets prompt context
- `storyBlurb`
- character name + character profile text (currently whatever is in the character card’s `card_contents`)

## Proposals (minimal, high-impact)

### Proposal A: Make character profiles a real step (or remove it)

Pick one:

- **A1 (recommended):** Move profile generation into its own pipeline step **after** `narrative_validator_agent` and `trail_review_agent`, and have it *update/replace* the existing character cards instead of adding more.
- **A2:** Remove the `characterProfileAgent` call from `characters_builder_agent` entirely until it is promoted to a real step, to avoid confusion and wasted tokens.

### Proposal B: Replace character cards in place (avoid duplicates)

If profiles are generated, the clean model is:
- seed cards create the roster + names
- profile step rewrites `card_contents` (and maybe title formatting) for those same `card_id`s

Mechanically this means:
- generate profile cards keyed by `linked_character_id` or matching `card_id`
- update existing character cards by id (do not append new ones)

### Proposal C: Keep all linking by id (already good)

Current secrets linking (`linked_character_id`) is the right direction. Extend the same idea to any future “relationship”, “clue linked to character”, or “host cue about character” cards:
- never join by `card_title`
- always join by `linked_character_id`

### Proposal D: Tighten “character roster contract” for downstream stability

Add/keep these invariants:
- exactly `playerCount` character cards exist after `characters_builder_agent`
- every character card has a `card_id` and non-empty `card_title`
- `solution.killer` must equal one of the character `card_title` strings (already enforced by allow-listing in `solutionPrompt`)

## Summary: what’s working vs what’s currently wasted

- **Working:** character seeds → canonical `context.cards` roster; secrets are id-linked and reliable.
- **Wasted today:** `characterProfileAgent` is invoked in a way that cannot improve the final output (wrong ordering + child context discard).

