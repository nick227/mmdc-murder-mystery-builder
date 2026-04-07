# Image Generator Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a generic `imageGeneratorAgent` that generates Flux images via Dezgo, saves them to the run directory, uploads to Cloudflare R2, and writes `image_url` onto eligible cards (serial, fail-fast, immutable-by-default).

**Architecture:** Add a provider client for Dezgo (arraybuffer PNG), an R2 storage service (S3-compatible, public URL), and a generic card-driven agent that iterates eligible cards in deterministic order, skipping those with existing `image_url` unless explicitly forced.

**Tech Stack:** Node.js (ESM), axios (for Dezgo HTTP), `@aws-sdk/client-s3` + presigner (for R2), existing pipeline agents + `context.cards`.

---

### Task 1: Preserve unknown fields in `pushCards()`

**Files:**
- Modify: `src/utils/cards.js` (`pushCards`)
- Test: `src/tests/cardSurfaceTest.js` (or create a small new unit test file under `src/tests/`)

**Step 1: Write the failing test**

- Add a test that calls `pushCards(context, 'character', [{ card_title, card_contents, image_url }])` and asserts the resulting stored card retains `image_url`.

**Step 2: Run test to verify it fails**

Run: `node src/tests/cardSurfaceTest.js`

Expected: FAIL because `image_url` is dropped.

**Step 3: Write minimal implementation**

- Update `pushCards()` to build the output card as `{ ...e, card_id, card_type, card_title, card_contents, act, ... }` while keeping unknown fields intact.
- Ensure normalization still trims `card_title` and `card_contents`, and still assigns `act` for non-`game_card`/`solution` when missing.

**Step 4: Run test to verify it passes**

Run: `node src/tests/cardSurfaceTest.js`

Expected: PASS.

**Step 5: Commit**

Run:
- `git add src/utils/cards.js src/tests/cardSurfaceTest.js`
- `git commit -m "feat: preserve custom fields in pushCards"`

---

### Task 2: Add Cloudflare R2 storage service

**Files:**
- Create: `src/storage/cloudflare/CloudflareR2Config.js`
- Create: `src/storage/cloudflare/CloudflareR2Service.js`
- Modify: `package.json` (add AWS SDK deps)

**Step 1: Add dependencies**

Run:
- `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

**Step 2: Implement config loader**

- `CloudflareR2Config` reads env vars:
  - `CLOUDFLARE_R2_ENDPOINT`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET`
  - `CLOUDFLARE_R2_PUBLIC_BASE_URL` (e.g. `https://cdn.example.com`)
- Provide:
  - `isConfigured()`
  - `getAwsConfig()` (S3Client config)
  - `getPublicUrl(key)`

**Step 3: Implement service**

- `saveImage(buffer, key, { contentType }) -> publicUrl`
- Keep it minimal for v1 (PutObject only); fail fast on errors.

**Step 4: Minimal verification**

Run: `npm run lint`

Expected: PASS.

**Step 5: Commit**

Run:
- `git add package.json package-lock.json src/storage/cloudflare/*`
- `git commit -m "feat: add Cloudflare R2 image storage service"`

---

### Task 3: Add Dezgo Flux client (PNG buffer)

**Files:**
- Create: `src/providers/dezgo/dezgoFluxClient.js`
- Modify (if needed): `src/providers/` index exports

**Step 1: Implement Flux request**

- Build `FormData` with Flux params (`prompt`, `width`, `height`, `steps`, `format=png`, etc.)
- POST to `https://api.dezgo.com/text2image_flux`
- Headers include `X-Dezgo-Key` and multipart headers
- `responseType: 'arraybuffer'`, timeout 120000
- Return `Buffer.from(response.data)`

**Step 2: Minimal verification**

Run: `npm run lint`

Expected: PASS.

**Step 3: Commit**

Run:
- `git add src/providers/dezgo/dezgoFluxClient.js`
- `git commit -m "feat: add Dezgo Flux image client"`

---

### Task 4: Add prompt builders for supported card types

**Files:**
- Create: `src/agents/image/promptBuilders.js`

**Step 1: Implement prompt builders**

- Make the registry optional: if a type is missing, fall back to `defaultPromptBuilder(card, context)`.
- Default fallback should be simple and generic:
  - `"Illustration of: " + card.card_title + "\n" + card.card_contents`
- Add initial builders for `character` and `story_act` (optional but preferred for quality).

**Step 2: Commit**

Run:
- `git add src/agents/image/promptBuilders.js`
- `git commit -m "feat: add image prompt builders for card types"`

---

### Task 5: Implement `imageGeneratorAgent` (generic, serial)

**Files:**
- Create: `src/agents/imageGeneratorAgent.js`
- Create: `src/agents/image/imageKey.js` (key building helpers)
- Modify: `src/pipeline/steps/index.js` (insert step after story acts + characters)

**Step 1: Implement agent core loop**

- Inputs: `{ types, force }`
- For each eligible card:
  - filter eligible cards in natural `context.cards` order only
  - if skip: log + continue
  - build prompt via registry if present, else `defaultPromptBuilder`
  - call Dezgo client → buffer
  - write local file under `context.runDir`
  - upload to R2 with key `images/{runId}/{card_type}/{card_id}.png` (or `-{timestamp}` on regen)
  - set `card.image_url = publicUrl`
  - log uploaded
- On error: throw immediately

**Step 3: Wire into pipeline**

- Add a step after `characters_builder_agent` and after `story_acts_agent` calling the same `imageGeneratorAgent` with `types: ['character']` and `types: ['story_act']` respectively, or a single later step with both types (keep serial order behavior deterministic).

**Step 4: Verification**

Run:
- `npm run lint`
- `npm run smoke` (requires env to be configured; if not configured, the agent should fail with a clear missing-credentials error)

**Step 5: Commit**

Run:
- `git add src/agents/imageGeneratorAgent.js src/agents/image/* src/pipeline/steps/index.js`
- `git commit -m "feat: generate and upload card images to R2"`

