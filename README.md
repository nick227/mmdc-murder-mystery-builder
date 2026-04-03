# MMDC — Murder Mystery Dev Builder

AI pipeline that generates fully playable social deduction murder mystery games from a single prompt.

The system builds:

* story premise and world setup
* playable characters
* hidden core truth (murder + treasure), validated case state
* items, deduction clues, and puzzle bundles (with evidence cards)
* structural checks, solvability validation, bundle structure, and integrity gates

Output is a structured, solvable mystery ready for play. The default pipeline is **core generation + structural glue + hard validators only** (no presentation layers, polish, repair, or “judge” steps). Extra narrative/host agents exist under `src/agents/` but are not wired into `steps/index.js`.

---

# Quick Start

```bash
node src/cli.js start "Shady motel party murder with a missing fortune" 4
```

On Windows, `npm start` runs the CLI with **`SMOKE_MODE` cleared** (real OpenAI), then prompts for story text, player count, and style:

```bash
npm start
```

Arguments:

```
start "<prompt>" <playerCount>
```

Example:

```bash
node src/cli.js start "Luxury yacht murder during a storm" 5
```

Use `npm run smoke` for a deterministic pipeline smoke test (mock LLM).

Output:

```
/runs/<run-id>/
```

---

# Pipeline Overview

Order is defined in `src/pipeline/steps/index.js`. Each stage feeds the next.

**Story, world, roster, solution**

```
story_blurb_agent
world_building_agent
characters_builder_agent
core_truth_agent
treasure_hunt_agent
core_truth_validator_agent
case_state_builder_agent
```

**Clues, targets, puzzles, bundles**

```
item_agent
clue_agent
clue_roster_validator_agent
clue_target_agent
puzzle_agent
puzzle_draft_canon_validator_agent
bundle_finalize_agent
puzzle_evidence_agent
bundle_visible_canon_validator_agent
bundle_linker_agent
structural_preflight_agent
```

**Validation and gate**

```
solvability_validator_agent
bundle_structure_validator_agent
post_final_invariants_agent
bundle_integrity_validator_agent
mvp_quality_gate_agent
```

That is **23 steps** total, in order. Extra agent modules under `src/agents/` (e.g. final editor, playability repair) are **not** wired in unless you register them in `steps/index.js`.

---

# Design Principles

### Deduction First

Clues must combine to reveal the solution. No single card should solve the mystery.

### Multi-Narrative Ambiguity

Competing suspect narratives help keep multiple readings open until late game.

### Puzzle-Supported Clues

Clues reinforce puzzles. Puzzles gate additional deduction where bundles are used. **`clue_target_agent`** derives frozen puzzle answer facts from murder clue cards; **`bundle_finalize_agent`** stamps each bundle’s hidden **solution** text to that fact so metadata and cards stay aligned.

### Canonical murder facts (drift control)

`coreTruth.murder` is authoritative for **killer**, **victim**, and **location** (exact strings). Later steps must not swap identities arbitrarily:

* **clue_roster_validator_agent** — every murder clue’s `suspect_name` matches a playable suspect (`baseName` roster) **or** the canonical victim when the clue centers on the deceased.
* **puzzle_draft_canon_validator_agent** / **bundle_visible_canon_validator_agent** — puzzle bundle evidence and puzzle card text (before/after evidence expansion) must contain the **exact** victim and location substrings from `coreTruth`.
* **bundle_structure_validator_agent** — bundle shape, acts, types, clue-target vs hidden solution match, and **no** wrong playable suspect named on bundle solution cards vs canonical killer.
* **`puzzle_evidence_agent`** only rewrites visible bundle evidence; it does not modify hidden solution cards.

Deterministic checks are skipped when **`SMOKE_MODE=true`**.

### Late Killer Reveal

The killer should emerge after combining multiple clues, not from one card.

### Social Deduction

Information is intentionally distributed across players.

---

# Card Types

Typical output includes types such as:

```
story_meta
person
location
item
character
secret
clue
story_act
host_speech
puzzle
solution
```

Many cards share:

```
card_id
card_title
card_contents
act (1–3, where applicable)
card_type
```

Puzzle bundle cards may also include `bundle_id`, `card_ref`, `hidden_until_solved`, and puzzle linkage fields after `bundle_linker_agent`.

---

# Acts

**Act 1**

* setup
* discovery
* early ambiguity

**Act 2**

* contradictions
* shifting suspicion
* puzzle solving

**Act 3**

* elimination
* final deduction
* accusation

---

# Validators (safety rails)

The shipped pipeline relies on **structural and identity checks**, plus **canonical string** checks for victim/location in bundles. It does not rely on heuristic “story polish” for correctness.

* **core_truth_validator_agent** — killer/victim/playable roster consistency (deterministic issues)
* **clue_roster_validator_agent** — murder clue `suspect_name` ∈ roster or canonical victim
* **puzzle_draft_canon_validator_agent** — puzzle drafts reference exact victim + location
* **bundle_visible_canon_validator_agent** — same after **puzzle_evidence_agent**
* **structural_preflight_agent** — e.g. victim named, duplicate person/character overlap
* **solvability_validator_agent** — LLM-assisted solvability judgment; **LLM repair is skipped** when puzzle bundle cards are present so stamped bundle text is not wholesale-replaced
* **bundle_structure_validator_agent** / **bundle_integrity_validator_agent** — bundle shape, refs, unlock wiring, solution vs `puzzle_bundles[].clue_target`
* **post_final_invariants_agent** — counts, resolved refs, no placeholder difficulty
* **mvp_quality_gate_agent** — final quality gate from persisted reports

**LLM HTTP errors:** transient OpenAI **5xx** / **`server_error`** responses are retried per step with backoff (see `src/queue/Worker.js`).

---

# Solvability Rules

The game should:

* contain puzzle bundles when the puzzle path is used
* contain multiple clues
* require clue combination
* avoid single-clue solutions
* avoid early killer reveal

---

# Project Structure

```
src/
  agents/
  prompts/
  schemas/
  utils/          # includes canonFacts.js, canonValidate.js, caseState, cards, etc.
  pipeline/
  llm/
  queue/
  cli.js
```

---

# Agents

Agents are async functions:

```
(context) -> context
```

They may add cards, enrich `context`, or run validation. Prefer **validators** for anything that must not break game state; use **generators** only to produce content.

---

# Adding a New Agent

1. Create `src/agents/myAgent.js` exporting an async `(context) => context` function.
2. Register it in **`src/pipeline/steps/index.js`** in the correct order.
3. Return the updated `context` (and keep `normalizeContext` expectations in mind).

---

# Goals

Generate mysteries that are:

* solvable
* replayable
* socially interactive
* narratively interesting
* deduction driven
* non-obvious

---

# Example Prompts

```
Shady motel party murder with missing fortune
Luxury yacht poisoning during blackout
Wedding reception murder with hidden inheritance
Film set murder during storm delay
Casino VIP murder with swapped briefcase
```

---

# Output

Each run generates artifacts under the run directory (e.g. `result.json` and supporting files), suitable for:

* print
* tabletop play
* digital play
* hosted events

---

# Philosophy

This system generates **deduction games**, not just stories.

The story supports the clues. The clues support deduction. The deduction reveals the killer.
