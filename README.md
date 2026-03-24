# MMDC — Murder Mystery Dev Builder

AI pipeline that generates fully playable social deduction murder mystery games from a single prompt.

The system builds:

* story premise
* hidden solution
* competing suspect narratives
* breadcrumb trails
* characters
* items
* puzzles
* deduction clues
* game cards
* host scripts

Output is a structured, solvable mystery ready for play.

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

Order matters. Each stage feeds the next.

```
story_blurb_agent
solution_agent

breadcrumb_trail_agent
trail_review_agent

narrative_generator_agent
narrative_validator_agent

story_acts_agent
host_speech_agent

character_profile_agent
character_secret_agent

item_agent
puzzle_agent
clue_agent

ambiguity_balancer_agent
solvability_validator_agent

game_card_agent
card_quality_agent
final_editor_agent
```

---

# Design Principles

### Deduction First

Clues must combine to reveal the solution.
No single card should solve the mystery.

### Multi-Narrative Ambiguity

Three competing suspect narratives remain viable until late game.

### Puzzle Supported Clues

Clues reinforce puzzles. Puzzles gate deduction.

### Late Killer Reveal

The killer emerges only after combining multiple clues.

### Social Deduction

Information is intentionally distributed across players.

---

# Card Types

```
story_act
host_speech
character
secret
item
puzzle
clue
game
```

All cards share:

```
card_title
card_contents
act (1-3)
card_type
```

---

# Acts

Act 1

* setup
* discovery
* early ambiguity

Act 2

* contradictions
* shifting suspicion
* puzzle solving

Act 3

* elimination
* final deduction
* accusation

---

# Ambiguity Balancer

Prevents early solution collapse.

It can:

* rewrite clues
* soften certainty
* shift cards later
* share access between suspects
* delay elimination

This keeps:

* multiple suspects viable
* deduction required
* pacing controlled

---

# Solvability Rules

The game must:

* contain at least one puzzle
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

Agents are pure functions:

```
(context) -> context
```

They may:

* add cards
* rewrite cards
* validate state
* rebalance ambiguity

---

# Adding a New Agent

1. Create agent

```
src/agents/myAgent.js
```

2. Add to pipeline

```
src/pipeline/steps.js
```

3. Return updated context

```
return context;
```

---

# Goals

Generate mysteries that are:

* solvable
* replayable
* socially interactive
* narratively interesting
* deduction driven
* non obvious

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

Each run generates:

```
cards.json
story.json
solution.json
printable/
```

Ready for:

* print
* tabletop play
* digital play
* hosted events

---

# Philosophy

This system generates **deduction games**, not just stories.

The story supports the clues.
The clues support deduction.
The deduction reveals the killer.
