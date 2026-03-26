# Proposal: Prompt improvements for playability and coherence (revised)

This doc reviews `src/prompts/**` (and how agents call them) with one goal: **surgical fixes** that address today’s failures—**drift, weak narratives, broken puzzles, conflicting instructions**—while reflecting the current architecture: a canonical hidden truth object at `context.solution`.

---

## The real problem (three contract breaks)

The pipeline does not have a vague “prompt problem.” It has **three specific breaks**:

| Break | What goes wrong |
|--------|------------------|
| **Truth → Narrative** | Narratives must stay aligned to the canonical `context.solution.killer` and the playable character roster. |
| **Narrative → Puzzle** | Puzzles **invent** facts and archetypes instead of **testing** relationships already implied by clues/narratives. |
| **Trail → Trail review** | Breadcrumb copy contradicts trail-review rules (e.g. “confirms killer” vs “don’t confirm”). |

Everything below is prioritized around fixing these. Optional or phase-2 items are labeled explicitly.

---

## Tier 1 — Fix immediately

### 1. Narratives must stay aligned to `context.solution.killer` (generation + validation)

**Issue:** narrative generation and validation must both treat `context.solution` as canonical, and must keep suspect names constrained to the playable roster.

**Current state:** prompts already reference `solution.killer`. The main risk becomes *name drift* (aliases/spelling) and narratives introducing “facts” that never materialize into trail/clue/item cards.

**Surgical fix:**
- Enforce “suspect names must match playable character `card_title` strings exactly”.
- Allow invention, but treat invented details as *color unless later discoverable* (avoid narrative-only hard proof).

**Files:** `src/prompts/narrativesPrompt.js`, `src/agents/narrativeGeneratorAgent.js`, `src/prompts/narrativeValidatorPrompt.js`, `src/agents/narrativeValidatorAgent.js`

**Outcome:** Keeps narratives coherent without over-policing creativity.

---

### 2. Puzzle generation must stop inventing reality (and stay schema-aligned)

**Issues:**

- Hardcoded archetypes (“chef”, “reclusive suspect”, etc.) **collide** with arbitrary casts.
- `puzzleCount` is interpolated in the prompt but **`puzzleAgent` may not pass it** → “exactly `undefined` puzzle cards.”
- **Deeper rule:** Puzzles are not where new canon is introduced—they **only test** relationships already implied by clues (and the shared premise). Otherwise players get “puzzle facts” that never appeared on clue cards.

**Fix:**

- Remove named archetypes; drive slots from **`narratives` suspect names** (and roles) only.
- Add explicit instruction: **Do not introduce new concrete facts; only ask deduction questions that can be answered from information players could have seen on clue/item cards and the public setup.**
- Pass **`puzzleCount`** from the agent and keep it aligned with the JSON schema.

**Current state note:** puzzle generation is now done as **puzzle bundles** (one puzzle + supporting cards) and is already schema-aligned via `puzzleBundleSchema`.

**Files:** `src/prompts/puzzlePrompt.js`, `src/agents/puzzleAgent.js`, `src/schemas/puzzleBundleSchema.js`

---

### 3. Trails must be solution-grounded and role-separated

**Issue:** trails are the canonical discovery scaffold. They should be grounded on `context.solution` but avoid “answer key” beats.

**Fix:** Use short, enforceable language models follow reliably, e.g.:

- Trails **narrow suspicion** but **do not identify the killer alone** (no single beat is sufficient to name the killer).

**Files:** `src/prompts/breadcrumbTrailPrompt.js`, `src/prompts/trailReviewPrompt.js`, `src/agents/breadcrumbTrailAgent.js`

---

### 4. Solution extraction must hard-bind killer to the playable roster

**Issues:**

- `buildMurderTruthPrompt` may use `context.profiles` (often empty) while real names live on **character cards**; `world` may be stringified awkwardly.
- Without a hard rule, the model can name a killer **who is not a playable character**.

**Fix:**

- Pass the **character list** from the same source players get (e.g. `context.cards` filtered to `character`: names + short roles).
- Add a **hard constraint** in the prompt: **The killer must be exactly one of the provided characters (by name).**
- Prefer **prose** for `world` in the user message unless you deliberately use structured world JSON everywhere.

**Files:** `src/prompts/solutionPrompt.js`, `src/agents/solutionAssemblerAgent.js`

---

## Tier 2 — After Tier 1 stabilizes

### 5. Unify naming (`killer` vs `killerName`)

Pick one key and use it in every prompt that mentions the private truth. Reduces silent mismatch between generator, validator, and any trail step that references a solution-shaped block.

### 6. Solvability validator inputs — **Phase 2**

Adding **narratives, trails, fortune** into the solvability judge is directionally right but **not** the first rollout: it increases **token load** and validation fragility (JSON/schema pressure) before core contracts are fixed.

- **Phase 2:** Add **small excerpts** only after Tier 1 is stable and the validator is reliable.

**Files:** `src/prompts/solvabilityValidatorPrompt.js`, `src/prompts/solvabilityRepairPrompt.js`

### 7. Final editor: system vs JSON contract (**keep; fix**)

**Issue:** `buildFinalEditorPrompt` system text asks for **plain text**; `finalEditorAgent` calls **structured JSON**. That invites **silent corruption** (model returns prose, code expects `{ cards: [...] }`).

**Fix:** Make system + user instructions match the **actual** output mode (JSON schema), or split into critique (text) + apply (JSON).

**Files:** `src/prompts/finalEditorPrompt.js`, `src/agents/finalEditorAgent.js`

---

## Tier 3 — Later / optional

### 8. World structure (location roster, “don’t invent new geography”)

**Not the current bottleneck** once logic contracts are fixed. Treat as **optional polish**: richer world prompts, named places lists, etc.

**Files:** `src/prompts/worldBuildingPrompt.js`

### 9. Story blurb as playability contract

Useful once Tier 1 cut **drift**; not required to unlock the three contract breaks above.

**Files:** `src/prompts/storyBlurbPrompt.js`

### 10. (No longer applicable) Full structured “solution” object

This is already implemented as `context.solution`. The remaining work is tightening contracts around its usage and name matching (which is now implemented in `solutionPrompt` via an allow-list).

---

## Rollout order (practical)

1. **Tier 1** (items 1–4): killer passthrough + narrative alignment; puzzle facts + count; breadcrumb copy; murder truth ∈ cast.  
2. **Tier 2 item 7**: final editor contract (high leverage, low dependency on new data).  
3. **Tier 2 items 5–6**: naming cleanup, then solvability context expansion.  
4. **Tier 3** as desired.

---

## Related (not prompt-only)

**Character profiles vs narratives:** `buildCharacterProfilesPrompt` is strongest when `narratives` exist; pipeline **order** may leave profiles under-informed. That is **agent/step** work as much as copy tweaks.

---

## Next step (if you want drop-in artifacts)

Minimal, high-yield deliverables to implement Tier 1 quickly:

- **Narratives prompt + agent args:** explicit `killer` (and optional short truth blurb), `true_narrative` mapping spelled in user block.  
- **Puzzle prompt:** no new facts; suspect-driven slots; wired `puzzleCount`.
