## Goal

Stabilize the MMDC pipeline by ensuring the context shape is normalized at the true entrypoint, job inputs reliably flow into `context`, and late-stage editing cannot silently corrupt core invariants. Replace regex-based “validator” checks with structured JSON validators.

## Non-goals

- Act pacing / design-layer pacing checks
- Tightening schemas that are already strict enough to enforce counts
- Duplicating bundle integrity checks in multiple places

## Current observed issues

- `src/queue/Worker.js` normalizes context, but `ensureJobContext()` initializes `job.context` with hardcoded defaults and does not copy `job.playerCount`, `job.storyStyle`, or `job.userPrompt` into `job.context`. This can cause CLI inputs to be ignored and creates drift between job fields and pipeline context.
- `murderValidatorAgent` and `fortuneValidatorAgent` use a regex truthiness test (`/pass|ok|valid/i`) that can incorrectly accept failures like “not valid”.
- Late-stage edits are already constrained by `finalEditorAgent` (card count + exact `card_id` set), and bundle integrity is validated by `bundleIntegrityValidatorAgent`, but we still want explicit post-final checks for character/secret invariants.

## Design

### 1) Pipeline entry: ensure job → context copy (P0)

Update `ensureJobContext(job)` in `src/queue/Worker.js`:

- When creating a new `job.context`, initialize it from `job` fields:
  - `playerCount` from `job.playerCount` (or `job.player_count`), defaulting to 4
  - `storyStyle` from `job.storyStyle` (or `job.story_style`)
  - `userPrompt` from `job.userPrompt`
  - preserve `runId`, `runDir`, and initialize `cards: []`
- When `job.context` already exists, do not overwrite fields; only ensure required fields exist and then normalize via `normalizeContext()`.

`normalizeContext()` remains the single normalization function and is already called at entry and after every step.

### 2) Post-final invariants (P0)

Add a new step `post_final_invariants_agent` directly after `final_editor_agent` and before `bundle_integrity_validator_agent`.

Checks:

- `character count === context.playerCount`
- `secret count >= character count` (optional but recommended; matches existing expectations used elsewhere)

Explicitly do **not** re-run bundle integrity here; bundle integrity remains validated by `bundleIntegrityValidatorAgent`.

### 3) Replace regex validators with JSON validators (P1)

Convert:

- `src/agents/murderValidatorAgent.js`
- `src/agents/fortuneValidatorAgent.js`

…to use `callJson()` with a strict schema:

- `{ pass: boolean, issues: string[] }`

Update the corresponding prompts to instruct returning JSON in that shape.

Failure behavior:

- If `pass !== true`, throw an error including a readable list of issues (and/or JSON string).

### 4) CLI storyStyle parsing fix (P1)

Update `src/cli.js` argument parsing to avoid mis-assigning `storyStyle` / `playerCount` when users provide arguments in slightly different forms.

Key behavior:

- If the second positional arg is present but not numeric and no explicit third arg is present, treat it as `storyStyle` and default `playerCount` to 4.

This change is only valuable because the worker now correctly copies job fields into context; both fixes together ensure CLI inputs reliably affect the pipeline.

## Success criteria

- Starting a job with CLI-provided `playerCount` and `storyStyle` reliably results in `context.playerCount` and `context.storyStyle` matching those values at pipeline entry.
- Pipeline fails fast if final editing somehow results in:
  - wrong character count relative to `playerCount`
  - secret coverage lower than character count
- Murder/Fortune validation cannot pass on strings like “not valid”.
- Existing smoke tests still pass in `SMOKE_MODE=true`.

