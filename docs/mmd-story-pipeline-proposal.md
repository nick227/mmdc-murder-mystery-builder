# MMDC Story Pipeline Improvement Proposal

## Review scope

This proposal is based on the live execution path in:

- `src/pipeline/steps/index.js`
- `src/queue/Worker.js`
- `src/pipeline/validate.js`
- key agents and prompts under `src/agents/` and `src/prompts/`
- representative output in `runs/1774441812838-rrkged/result.json`

## Executive summary

The main problem is not orchestration complexity. The main problem is contract instability inside a simple sequential pipeline.

The best next step is a minimal stabilization pass:

- normalize context keys once
- keep `context.cards` as the single card store
- add stable `card_id` values to every card
- stop linking by title
- enforce hard invariants for character count, secrets, and act structure
- add a minimal structured hidden `solution`
- replace regex validators with JSON validators

This keeps the architecture small while fixing the failure modes that are already showing up in real runs.

## Confirmed failure modes

These are visible today in code and output:

- context key drift causes silent prompt corruption
- some prompt builders expect fields callers do not provide
- character identity is currently too weak to support reliable linking
- profile generation is being done on a child context that is never merged back
- validators can false-pass because they use regex on free text
- late editor stages can replace the whole card set without inventory protection

Recent run evidence from `runs/1774441812838-rrkged/result.json`:

- `playerCount` was `4`
- `storyStyle` ended up as `"4"`
- final output contained `7` `character` cards
- those `character` cards included non-people such as `The Crimson Masquerade` and `Blood Ruby`
- final output contained `0` `secret` cards

## Top 10 high-value improvements

### 1. Normalize context keys once in `ensureJobContext()`

**Why it matters**

This is the biggest root cause. Key drift means steps can run with missing inputs while the pipeline still appears to succeed.

**Evidence**

- `story_blurb` vs `storyBlurb`
- `playerCount` vs `player_count`
- `profiles`, `character_profiles`, and `cards` are all used as if they describe the same domain

**Proposal**

Normalize legacy keys once at pipeline start and then only use canonical names afterward.

Minimal canonical set:

- `storyBlurb`
- `storyStyle`
- `playerCount`
- `world`
- `solution`
- `trails`
- `narratives`
- `cards`

### 2. Add `card_id` to every card and stop linking by title

**Why it matters**

Title-based linking is fragile. If a title changes during editing, links break.

**Evidence**

- `src/agents/characterSecretAgent.js` writes `linked_character: character.card_title`
- editor and repair stages are allowed to rewrite cards

**Proposal**

Generate a stable `card_id` for every card in `pushCards()`. Replace all title-based links with id-based links such as:

- `linked_character_id`
- `linked_clue_id`
- `source_card_id`

Keep titles as presentation only, not identity.

### 3. Enforce exact playable character count

**Why it matters**

Right now the pipeline does not reliably guarantee that the number of character cards matches `playerCount`.

**Evidence**

- recent run: `playerCount: 4`, final output: `7` character cards

**Proposal**

Add a hard invariant immediately after `charactersBuilderAgent` and again after late editor stages:

- count of `card_type === "character"` must equal `playerCount`

If the invariant fails, stop the run or repair to the exact expected count.

### 4. Enforce at least one secret per character

**Why it matters**

Secrets are core to social deduction play. Missing secret cards is not a cosmetic bug.

**Evidence**

- recent run ended with `0` secrets
- `character_secret_agent` exists in the live step list

**Proposal**

Make this a hard invariant:

- secret count must be at least character count

If you want stricter enforcement later, require exactly one or a bounded range per character. For now, minimum one per character is enough.

### 5. Add a minimal hidden `solution` object

**Why it matters**

Some prompts are clearly built to reason over structured truth, but the live pipeline mostly passes free-text truth strings.

**Evidence**

- `src/prompts/trailReviewPrompt.js` expects `solutions`
- `src/prompts/narrativesPrompt.js` expects `solutions`
- `src/prompts/narrativeValidatorPrompt.js` expects `solutions.killer`

**Proposal**

Add a minimal structured object after murder and fortune truth generation:

```json
{
  "killer": "",
  "method": "",
  "location": "",
  "motive": ""
}
```

Do not over-expand this yet. Keep the strings if useful for debugging, but make `solution` the hidden truth object for downstream steps.

### 6. Fix the child-context profile bug and move enrichment to the right place

**Why it matters**

This is a concrete bug, not just a design concern.

**Evidence**

- `src/agents/charactersBuilderAgent.js` calls `characterProfileAgent(childContext)`
- the child result is never merged back into `context`
- `characterProfileAgent` also wants `trails` and `narratives`, which do not exist yet at that point in the live pipeline

**Proposal**

Stop generating profile cards inside `charactersBuilderAgent`.

Choose a simpler flow:

1. Generate character cards early.
2. Generate truth, trails, and narratives.
3. Enrich or extend character cards later when the needed context exists.

### 7. Fix agent-to-prompt contract mismatches before adding more features

**Why it matters**

Several quality steps are wired against the wrong inputs, so they cannot enforce the constraints they were written for.

**Evidence**

- `narrativeGeneratorAgent` passes truth strings into a prompt that expects `solutions`
- `trailReviewAgent` passes truth strings into a prompt that expects `solutions`
- `finalEditorAgent` passes raw `context`, but the prompt expects `storyBlurb`

**Proposal**

For each agent, build the exact prompt input object expected by the prompt builder. Do not pass raw `context` unless the prompt signature is designed for it.

This is one of the fastest high-return fixes in the repo.

### 8. Replace regex validators with JSON validators

**Why it matters**

Regex validation on free text is unsafe and can false-pass.

**Evidence**

- `/pass|ok|valid/i` appears in murder, fortune, and narrative validators
- this can match strings like `not valid`

**Proposal**

All validators should return JSON:

```json
{
  "pass": false,
  "problems": ["unique killer opportunity not established"]
}
```

This gives deterministic pass/fail behavior and actionable repair input.

### 9. Protect card inventory in editor and repair stages

**Why it matters**

Late stages currently have enough authority to silently delete required card types.

**Evidence**

- `src/agents/finalEditorAgent.js` can fully replace `context.cards`
- `src/agents/solvabilityValidatorAgent.js` can rewrite the full card array
- recent run ended with `0` secrets

**Proposal**

Add hard post-edit checks for:

- total character count
- minimum secret count
- exact story act count
- required card types still present

Prefer patch-style edits over full-array replacement where possible.

### 10. Enforce act pacing as an explicit invariant

**Why it matters**

The pipeline depends on Act 1, 2, and 3 pacing, but nothing currently enforces it as a game-quality rule.

**Proposal**

Add act-level checks to late validation:

- Act 1 should not over-prove the killer
- Act 2 should preserve multiple viable suspects
- Act 3 can narrow sharply but must retain a deduction step
- exactly 3 `story_act` cards must exist

This should live in solvability or final validation, not only in prompt wording.

## Recommended implementation order

### Phase 1: stabilize the pipeline

1. Normalize context keys in `ensureJobContext()`
2. Fix CLI parsing so `storyStyle` is not set from player count
3. Add `card_id` in `pushCards()`
4. Replace title-based linking with id-based linking
5. Enforce exact character count after character generation
6. Enforce minimum secrets after secret generation
7. Fix agent-to-prompt contract mismatches

### Phase 2: improve reasoning reliability

8. Add minimal structured `solution`
9. Replace regex validators with JSON validators
10. Fix the profile-agent timing and child-context bug

### Phase 3: protect final output quality

11. Protect card inventory in repair and editor stages
12. Enforce act pacing in late validation

## What not to over-engineer yet

These are useful later, but not the best next move:

- a separate canonical `context.characters[]` store
- a large, deeply structured solution schema
- a full contract-test matrix for every agent/prompt pair

For now, the right move is to stabilize the existing card-centric pipeline rather than introduce more state surfaces.

## Expected outcome

If Phase 1 is done correctly, the pipeline should become materially more deterministic and debuggable.

If Phase 1 and Phase 2 are done correctly, the pipeline should stop producing obviously broken runs such as:

- wrong number of character cards
- missing secrets
- broken character links
- validators passing on invalid output

That is the smallest set of changes with the highest payoff.
