## Goal

Add a generic, reusable image-generation step that can attach a top-level `image_url` to selected card types by:

- requesting an image from Dezgo (Flux model)
- saving the image locally inside the run directory
- uploading the image to Cloudflare R2 (public CDN)
- storing the resulting public URL on the card as `image_url`

Initial rollout targets `character` and `story_act` cards, but the design must be reusable for any card type in the future.

## Non-goals

- Parallelism / concurrency (execution is strictly serial)
- Automatic retries (rerun pipeline to retry)
- Forcing the LLM to emit `image_url` (this is a post-step mutation)
- Building a UI for browsing images
- Introducing a global story ID (use `context.runId`)

## Current context / constraints

- The pipeline stores generated content in `context.cards` via `pushCards()` (`src/utils/cards.js`).
- `pushCards()` currently **whitelist-copies** fields, which would drop new card fields like `image_url`.
- Runs are treated as immutable snapshots; avoid overwriting images in local or R2 storage.
- Fail-fast is preferred: stop immediately on the first API/storage error.
- Determinism and reproducibility matter: once `image_url` exists, default behavior is to skip.

## Design

### 1) Make the agent generic and card-driven

Create a single agent:

- `imageGeneratorAgent(context, { types, force })`

Where:

- `types`: array of card types eligible for image generation (e.g. `['character', 'story_act']`)
- `force`: boolean; if true, regenerate all eligible cards regardless of existing `image_url`

Eligibility for a given card is:

- `types.includes(card.card_type)`

The agent must not assume any “3 acts” structure. It operates per card.

### 2) Prompt builder registry per card type

Define a central prompt builder registry:

- `promptBuilders[card.card_type](card, context) -> string`

Prompt builders are optional. If a type-specific builder is not present, fall back to:

- `defaultPromptBuilder(card, context) -> string`

Suggested fallback (simple, reusable immediately):

- `"Illustration of: " + card.card_title + "\n" + card.card_contents`

Later expansion can add type-specific builders for:

- `character`, `story_act`, `item`, `location`, `clue`, etc.

### 3) Image immutability and explicit regeneration

Default:

- if `card.image_url` exists, and no overrides apply → **skip**

Overrides:

- force run: `force === true` → regenerate all eligible
- per-card: `card.regenerate_image === true` → regenerate that card only

Final behavior:

- normal run:
  - no `image_url` → generate
  - has `image_url` → skip
- force run:
  - `force=true` → regenerate all eligible
- per-card:
  - `regenerate_image=true` → regenerate only this card

After regeneration, update:

- `card.image_url = <new_url>`

### 4) Strictly serial, fail-fast execution

Execution is serial, no batching:

```
for card in eligibleCards:
  if skip: log + continue
  generate image (Dezgo)
  save locally
  upload to R2
  set card.image_url
  log uploaded
  if error: throw immediately
```

No retries; rerun the pipeline to retry.

### 5) Deterministic processing order

Process eligible cards strictly in their natural order of appearance in `context.cards`.

This keeps the image agent fully reusable and pipeline-driven, without hardcoded type ordering.

### 6) Storage keys (never overwrite)

Use `context.runId` as the prefix for both local and R2 keys.

Local path (never overwrite):

- `runs/{runId}/images/{card_type}/{card_id}.png`

R2 key (first generation):

- `images/{runId}/{card_type}/{card_id}.png`

R2 key (regeneration):

- `images/{runId}/{card_type}/{card_id}-{timestamp}.png`

This preserves old URLs, avoids collisions, and keeps regeneration scoped to a run.

### 7) Logging (console only)

Emit a log line for each decision/action:

- skip: `image_agent: skip card_id=... type=... (has image_url)`
- generate: `image_agent: generate card_id=... type=...`
- regenerate: `image_agent: regenerate card_id=... type=... reason=force|per-card`
- upload success: `image_agent: uploaded key=... url=...`
- error: `image_agent: error card_id=... provider=dezgo|r2 msg=...`

### 8) Critical: update `pushCards()` to preserve unknown fields

`pushCards()` must not drop unknown fields like `image_url`.

Change the card construction from whitelist-copying fields to preserving the incoming card object and then normalizing:

- base behavior: `const card = { ...e, ...normalizedOverrides }`
- ensure `card_id` exists
- ensure `card_type`, `card_title`, `card_contents` are normalized/trimmed
- keep existing optional fields intact (including `image_url`)

This is required for the entire “cards can gain new properties” strategy.

## Success criteria

- Normal runs generate and attach `image_url` for eligible cards that do not already have one.
- Cards with existing `image_url` are skipped by default.
- Regeneration only happens with explicit override (`force` or `regenerate_image`).
- Image generation is serial and fails fast on first error.
- Storage never overwrites existing local or R2 objects.
- `pushCards()` no longer drops `image_url` (or any other future card fields).

