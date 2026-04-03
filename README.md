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

Arguments:

```
start "<prompt>" <playerCount>
```

Example:

```bash
node src/cli.js start "Luxury yacht murder during a storm" 5
```

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

**Clues, puzzles, bundles**

```
item_agent
clue_agent
puzzle_agent
bundle_finalize_agent
puzzle_evidence_agent
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

Extra agent modules under `src/agents/` (e.g. final editor, playability repair) are **not** wired into this pipeline unless you add them back in `steps/index.js`.

---

# Design Principles

### Deduction First

Clues must combine to reveal the solution. No single card should solve the mystery.

### Multi-Narrative Ambiguity

Competing suspect narratives help keep multiple readings open until late game.

### Puzzle-Supported Clues

Clues reinforce puzzles. Puzzles gate additional deduction where bundles are used.

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

The shipped pipeline relies on **structural and identity checks**, not heuristic “story polish”:

* **core_truth_validator_agent** — killer/victim/playable roster consistency
* **structural_preflight_agent** — e.g. victim named, duplicate person/character overlap
* **solvability_validator_agent** — LLM-assisted solvability check (and optional repair when allowed)
* **bundle_structure_validator_agent** / **bundle_integrity_validator_agent** — bundle shape, refs, and unlock wiring
* **post_final_invariants_agent** — counts, resolved refs, no placeholder difficulty
* **mvp_quality_gate_agent** — final quality gate from persisted reports

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
  utils/
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
