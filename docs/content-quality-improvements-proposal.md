# Content Quality Improvements Proposal

This document proposes the highest-value content improvements for four weak spots in the current murder-mystery card pipeline:

1. stronger writing on gate/outcome cards
2. better puzzle variety
3. better bundle progression/connectivity aesthetics
4. cleaner clue specificity and narrative payoff

The intent is not to replace the current bundle contract. The intent is to make the existing `gate -> puzzle -> outcome` structure feel sharper, more legible, and more satisfying in play.

## Priority Summary

| Area | Highest-value improvement | Why it matters |
|------|---------------------------|----------------|
| Gate/outcome writing | Make every gate card an observable setup and every outcome card a consequential reveal | Improves readability and perceived quality immediately |
| Puzzle variety | Shift from type labels to distinct reasoning experiences | Prevents repetition even when schemas technically vary |
| Bundle progression/connectivity | Make later bundles visibly reuse earlier discoveries in a motivated way | Makes the investigation feel cumulative instead of modular |
| Clue specificity and payoff | Replace vague implication with concrete discriminators tied to a suspect-space change | Makes clues feel fair, memorable, and narratively earned |

## 1. Stronger Writing On Gate/Outcome Cards

### Current weakness

The structure is correct, but the prose role of each card is often blurry:

- gate cards sometimes read like filler setup instead of a usable observation
- outcome cards sometimes paraphrase what players already suspected instead of changing the board
- both card types can sound generically procedural rather than story-specific

### Highest-value improvements

#### A. Give gate cards one job: present a concrete inspection target

A strong gate card should feel like, "Here is the thing you can now examine."

Requirements:

- must describe a physical artifact, record, contradiction, or bounded testimony
- must include at least one concrete discriminator:
  - exact time
  - location
  - object detail
  - access restriction
  - initials / code / label / room number
- must not explain the deduction for the player
- must create curiosity that naturally motivates the puzzle

Weak gate:

> A strange note may be important.

Strong gate:

> The pantry inventory sheet has two entries for the same silver dessert knife, one logged at 8:10 PM and another initialed "M.L." at 8:26 PM.

#### B. Give outcome cards one job: change the investigation state

A strong outcome card should answer, "What do players know now that they could act on?"

Requirements:

- must introduce new information, not a restatement
- must change suspect space, timeline confidence, or object ownership
- should name the consequence directly using verbs like:
  - narrows
  - eliminates
  - links
  - contradicts
  - proves access
  - breaks an alibi
- must still stop short of solving the whole case alone

Weak outcome:

> This suggests someone tampered with the weapon.

Strong outcome:

> The corrected inventory proves the dessert knife was removed from the pantry after the toast began, breaking the caterer’s claim that no staff entered the service hall after 8:15 PM.

#### C. Separate voice by function

Gate cards should feel observational.
Outcome cards should feel interpretive but still evidence-bound.

Practical style split:

- gate = what is seen, found, logged, stamped, recorded, overheard
- outcome = what this newly permits players to infer

#### D. Ban generic mystery language

Avoid phrases like:

- strange clue
- important evidence
- suspicious note
- may be connected
- hints at a secret

These phrases consume space without increasing solvability or atmosphere.

### Recommended prompt changes

Update puzzle-bundle instructions so that:

- gate cards are framed as "inspection targets"
- outcome cards are framed as "state-changing reveals"
- each must include at least one concrete discriminator
- outcome cards must state the investigative consequence explicitly

Primary touchpoint:

- [src/prompts/puzzlePrompt.js](/C:/wamp64/www/mmdc2-dev-builder/src/prompts/puzzlePrompt.js)

### Acceptance standard

A reviewer should be able to ask two questions and get clean answers:

1. Why would players look at this gate card?
2. What new investigative move does this outcome unlock?

If either answer is vague, the bundle copy is weak even if the structure is valid.

## 2. Better Puzzle Variety

### Current weakness

The repo already lists multiple puzzle types, but type diversity is not the same as play-feel diversity. Several bundles can still collapse into the same experience:

- read two cards and notice a contradiction
- extract an obvious answer from one artifact
- decode flavor text that does not materially change the reasoning mode

### Highest-value improvements

#### A. Design for reasoning mode variety, not just schema variety

Target distinct puzzle experiences such as:

- comparison: line up two or more records to detect mismatch
- sequencing: reconstruct order of events from partial timestamps
- spatial inference: use room adjacency, routes, or access zones
- ownership tracing: match object provenance to character access
- elimination grid: rule suspects or methods out through intersecting constraints
- transformation: decode or reformat something meaningful, then apply it to another card
- combination: physically combine object details from multiple cards

The key is that each bundle should ask players to think differently, not just read different nouns.

#### B. Reserve ciphers for short, high-clarity wins

Ciphers should be the exception, not the dominant "variety" mechanism.

Use ciphers when:

- the encoded material is short
- the decode target is concrete
- the result immediately feeds another clue, location, or access fact

Avoid ciphers when they only produce atmosphere or repeat information already implied elsewhere.

#### C. Match puzzle type to evidence domain

Certain evidence naturally fits certain puzzle modes:

- logs, receipts, schedules -> sequencing or comparison
- maps, floor plans, service routes -> spatial inference
- labels, keys, containers, fragments -> combination
- testimonies and alibis -> elimination or contradiction mapping

This produces more natural-feeling bundles than picking a puzzle type first and forcing the evidence to imitate it.

#### D. Enforce a no-repeat pacing rule across a run

Across one generated game:

- no back-to-back bundles should use the same core reasoning mode
- at least one bundle should reuse a prior outcome in a different reasoning mode than the bundle that produced it
- the hardest bundle should usually combine two reasoning modes

### Recommended prompt and validation changes

Prompt:

- ask for a `reasoning_mode` internally, even if it is not persisted on final cards
- instruct later bundles to prefer a different reasoning mode from the immediately previous bundle

Validation:

- add lightweight debug reporting on reasoning-mode distribution per run
- warn when three bundles in a run collapse into the same comparison pattern

Primary touchpoints:

- [src/prompts/puzzlePrompt.js](/C:/wamp64/www/mmdc2-dev-builder/src/prompts/puzzlePrompt.js)
- [src/agents/cardQualityAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/cardQualityAgent.js)

### Acceptance standard

When playtesting, players should describe bundles with different verbs:

- "we lined these up"
- "we decoded this"
- "we mapped the route"
- "we ruled people out"
- "we combined these pieces"

If every puzzle is described as "we just read it and noticed the answer," variety is still poor.

## 3. Better Bundle Progression / Connectivity Aesthetics

### Current weakness

The repo already protects formal connectivity, but formal connectivity alone does not guarantee satisfying progression. A bundle can be technically linked and still feel cosmetically disconnected.

Typical failure modes:

- a later bundle references an earlier outcome without feeling motivated
- outcome reuse is invisible to players because the callback is too thin
- the chain exists structurally, but escalation does not

### Highest-value improvements

#### A. Make every connected bundle feel like a callback, not a coincidence

When a later puzzle depends on an earlier outcome, the later gate card should visibly acknowledge that dependency.

Example pattern:

- earlier outcome: a room key was signed out under false initials
- later gate: a maintenance route sheet shows only rooms accessible with that master key

This feels cumulative because the second bundle is legible as a consequence of the first.

#### B. Escalate from observation -> contradiction -> consequence

Ideal bundle chain shape:

1. Bundle A reveals a suspicious fact
2. Bundle B uses that fact to contradict a claim or alibi
3. Bundle C turns that contradiction into suspect narrowing or motive/access linkage

This gives the investigation a narrative curve instead of a bag of unrelated reveals.

#### C. Make outcome cards "portable"

The best outcomes are reusable because they contain a durable investigative fact:

- access rights
- corrected timeline detail
- ownership or provenance
- hidden relationship
- route or room restriction

Portable outcomes connect more elegantly than soft interpretations like "someone lied."

#### D. Prefer visible thematic clusters

Good connectivity aesthetics often come from repeating a domain with escalation:

- kitchen records -> pantry access -> service corridor route
- phone log -> burner number -> meeting location
- costume inventory -> missing clasp -> fabric transfer

Players feel momentum when bundles stay adjacent long enough to build a thread.

### Recommended prompt and validation changes

Prompt:

- ask later bundles to reuse earlier outcomes specifically as evidence inputs, not just as formal requirements
- tell the model to preserve thematic adjacency for at least 2-bundle arcs

Validation:

- expand connectivity diagnostics beyond "linked or isolated"
- add warnings for:
  - thin callback: later bundle requires an earlier outcome but does not materially build on its content
  - flat escalation: linked bundles repeat the same level of insight

Primary touchpoints:

- [src/prompts/puzzlePrompt.js](/C:/wamp64/www/mmdc2-dev-builder/src/prompts/puzzlePrompt.js)
- [src/agents/bundleLinkerAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/bundleLinkerAgent.js)
- [src/agents/cardQualityAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/cardQualityAgent.js)

### Acceptance standard

A player looking back over the solved chain should be able to summarize it as a story:

> First we learned X, which let us test Y, which exposed Z.

If the chain reads as disconnected evidence packets, progression still needs work.

## 4. Cleaner Clue Specificity And Narrative Payoff

### Current weakness

Clues can remain technically non-decisive while still feeling mushy:

- too much implication, not enough concrete detail
- clues do not clearly alter the suspect space
- narrative arcs promise a reveal that the final clue set does not cash out

### Highest-value improvements

#### A. Every clue should contain a discriminator

A clue becomes memorable and playable when it includes a detail players can carry forward.

Best discriminator categories:

- time
- place
- access condition
- named object detail
- signature / initials / serial / label
- contradiction against a prior statement

Weak clue:

> Someone was near the study before the murder.

Strong clue:

> The study door log records a manual override at 8:43 PM, three minutes after Elias claimed the corridor had already been sealed.

#### B. Make each clue earn a deduction role

Clues should not just exist in an act. They should do one clear job:

- widen suspicion
- preserve ambiguity while concentrating pressure
- invalidate a bad narrative
- strengthen the true narrative without ending the case alone

This should be visible in the wording, not only in metadata like `trail_role`.

#### C. Tie clue writing to narrative promises

If a suspect narrative implies:

- secret access
- a hidden relationship
- a false alibi
- motive hidden behind a red herring

Then at least one later clue should concretely cash that out.

Narrative payoff fails when the story hints at something emotionally or dramatically, but the clue layer never produces the specific evidence that operationalizes it.

#### D. Prefer contradiction over mood

Objective clue writing should privilege friction between facts:

- statement vs log
- claim vs timestamp
- ownership claim vs inventory mark
- route claim vs access map

This gives players something to reason with, and it keeps clue tone grounded.

### Recommended prompt changes

Update clue instructions so that:

- every clue must include at least one discriminator
- every clue must implicitly answer "what claim does this support, pressure, or damage?"
- at least one Act 3 clue should explicitly invalidate a previously viable non-killer narrative

Primary touchpoint:

- [src/prompts/cluesPrompt.js](/C:/wamp64/www/mmdc2-dev-builder/src/prompts/cluesPrompt.js)

### Acceptance standard

For each clue, a reviewer should be able to state:

1. the concrete detail it contributes
2. the suspect-space effect it has
3. the narrative promise it pays off, if any

If those cannot be named in one sentence each, the clue is too vague.

## Recommended Rollout Order

1. Strengthen gate/outcome card copy rules first.
2. Tighten clue specificity requirements second.
3. Add puzzle reasoning-mode variety rules third.
4. Add connectivity-aesthetic checks last, once copy quality is stronger.

This order matters because stronger local card writing makes later bundle-link quality much easier to evaluate.

## Practical Definition Of "Better"

The content quality is materially better when:

- gates are specific enough to invite inspection
- outcomes feel consequential and reusable
- puzzles vary by reasoning experience, not just label
- linked bundles feel cumulative
- clues contain concrete discriminators
- narrative beats receive explicit evidence payoff

If those six qualities are visible in a generated run, the deck will feel more authored even when it is fully model-generated.
