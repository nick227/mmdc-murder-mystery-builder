# Gameplay Upgrade Proposal

Run reviewed: `C:\wamp64\www\mmdc2-dev-builder\runs\1774606279271-3gfkm1\result.json`

## Summary

This run does not show every problem previously reported.

Not confirmed in this artifact:

- There is no act-regression paradox. Bundle 001 is Act 1 and does not require a later unlock. Bundle 002 requires `bundle_unlock_001`, bundle 003 requires `bundle_unlock_002`, and bundle 004 requires `bundle_unlock_003`.
- Placeholder puzzle titles like `Puzzle Bundle 3 Card 4` do not appear in this result.

Confirmed gameplay issues:

- The puzzle graph is over-connected and front-loaded rather than cleanly staged.
- Puzzle payoff is uneven and sometimes too vague.
- Several puzzle cards reveal their own answer directly in visible text.
- Escalation is weak because the last three bundles all sit at Act 2 and hard difficulty.
- Bundle outcomes do not always create a strong board-state change.

## What The Run Actually Shows

### 1. Chain exists, but progression is too dense

The connectivity report is not isolated. It shows:

- `puzzle_bundle_001`: `out_degree 3`, `chain_depth 4`
- `puzzle_bundle_002`: `in_degree 1`, `out_degree 2`
- `puzzle_bundle_003`: `in_degree 2`, `out_degree 1`
- `puzzle_bundle_004`: `in_degree 3`, `out_degree 0`

This means the system is not failing to chain. It is doing the opposite: earlier unlocks are being reused too broadly, so the graph feels cumulative in a technical sense but not staged in a dramatic sense.

Current feel:

- bundle 001 feeds almost everything
- later bundles accumulate prior certainty instead of introducing one new pivot each
- the investigation becomes a stack of confirmations instead of a sequence of reversals

### 2. Escalation is flat

Bundle acts are:

- bundle 001: Act 1
- bundle 002: Act 2
- bundle 003: Act 2
- bundle 004: Act 2

That removes Act 3 puzzle escalation entirely. All four bundles also land at `hard`, so the pacing does not step up in a controlled way.

Target shape should be:

- Act 1: discovery and first narrowing
- Act 2: contradiction and suspect reduction
- Act 3: decisive elimination or proof path

### 3. Some outcomes are concrete, some are too weak

This run is mixed.

Strong enough:

- bundle 002 confirms Lila had exclusive opportunity
- bundle 004 eliminates Nina from opportunity

Weak or under-specified:

- bundle 001 `actionable_gain` says it will narrow by access and opportunity, but `solution_summary` is only `Lila Grant`
- bundle 003 narrows to a single suspect, but the emotional or narrative shift is still just another confirmation of Lila

The result is a deduction track that repeatedly says "it was Lila" instead of changing the board in distinct ways.

### 4. Visible puzzle text leaks the answer

This is the biggest gameplay problem in the run.

Examples:

- bundle 002 puzzle card includes `Solution:` directly in `card_contents`
- bundle 004 puzzle card also includes `Solution:` directly in `card_contents`

That breaks play immediately. Players should not solve a puzzle whose visible card already contains the conclusion.

### 5. Gate cards are better than before, but still need a stricter standard

This run does include concrete artifacts:

- access log
- witness statements
- forensic report
- security footage
- display tampering

So the cards are not purely abstract suspicion. That said, many still read like summary evidence rather than inspectable game objects.

Upgrade target:

- cards should present observable data players can compare
- cards should avoid already-processed conclusions
- cards should privilege raw evidence over editorial summary

Weak:

- "Cross-referenced evidence confirms..."

Strong:

- "Access log shows booth key signed out at 9:48 PM under L.G."

### 6. Bundle payoff lacks narrative variety

Puzzle labels differ, but the actual reasoning pattern is still repetitive:

- compare 3-4 clues
- confirm Lila had access/opportunity
- unlock another confirmation

That produces technical progression without dramatic progression.

The bundles should diversify by function:

- bundle 1: establish murder was intentional and scene access matters
- bundle 2: break one suspect alibi
- bundle 3: tie weapon/object chain to one person
- bundle 4: force final elimination or reveal treasure-location implication

## Upgrade Goals

### Goal 1. Enforce one outbound reveal per bundle

Make each bundle contribute exactly one new state change.

Good examples:

- eliminate one suspect
- prove one suspect had exclusive access
- connect one object to one person
- reveal one concealed location or movement path

Bad examples:

- narrow suspect space
- confirm suspicion
- strengthen the case

### Goal 2. Change graph shape from dense reuse to staged progression

Current graph is too broad.

Recommended rule:

- bundle N may require local evidence plus at most one cross-bundle unlock from bundle N-1
- optional exception: final bundle may also require one earlier global fact if it creates a satisfying culmination

Target graph:

`A -> B -> C -> D`

Not:

- `A -> B, C, D`
- `A + B -> C`
- `A + B + C -> D` by default

### Goal 3. Separate acts cleanly

Require puzzle acts to escalate:

- bundle 1 puzzle: Act 1
- bundle 2 puzzle: Act 2
- bundle 3 puzzle: Act 2 or early Act 3
- bundle 4 puzzle: Act 3

Also derive difficulty from role in the chain, not just required-card count.

Recommended default:

- bundle 1: easy or medium
- bundle 2: medium
- bundle 3: medium or hard
- bundle 4: hard

### Goal 4. Ban visible answer leakage

Add a hard validator:

- puzzle `card_contents` must not contain `Solution:`
- puzzle `card_contents` must not restate `solution`
- puzzle `card_contents` must not name the solved suspect unless the design explicitly intends a final accusation card

If violated, reject the bundle.

### Goal 5. Tighten gate-card design

Gate cards should be inspectable artifacts, not adjudicated conclusions.

Required pattern:

- one object
- one observation
- one constraint players can compare

Examples by bundle type:

- timeline: timestamped log, receipt, camera timestamp, sign-in sheet
- item combination: fibers, scratches, serials, residues, broken seal, matching fit
- access puzzle: lock record, restricted key log, route map, guard note
- elimination: presence matrix, area access list, observed location record

### Goal 6. Make each unlock card a narrative twist, not a summary

Current unlock cards often read like:

- "confirmed access and opportunity"
- "exclusive opportunity confirmed"

They should instead reveal the next dramatic fact.

Examples:

- "The booth key was returned 12 minutes after Max entered"
- "The sleeve fibers match Lila's coat lining"
- "The display tampering happened before the rooftop argument"

That gives players a reason to care about the unlock beyond bookkeeping.

## Recommended Implementation Plan

### Phase 1. Fix hard gameplay failures

- Reject any puzzle card whose visible text contains the solution or an explicit `Solution:` section.
- Require the final bundle to be Act 3.
- Restrict cross-bundle dependencies to one upstream unlock by default.
- Reject any run where all bundle difficulties collapse to the same level unless explicitly justified.

### Phase 2. Improve board-state change quality

- Replace generic `actionable_gain` language with a controlled outcome taxonomy.
- Require each puzzle to map to one concrete effect:
  - `eliminate_suspect`
  - `break_alibi`
  - `prove_access`
  - `link_object`
  - `reveal_location`
- Validate that `solution_summary` describes the effect, not just the suspect name.

### Phase 3. Improve evidence quality

- Introduce evidence-card templates by puzzle type.
- Bias generation toward raw artifact text and observable details.
- Penalize cards that summarize conclusions instead of presenting evidence.

### Phase 4. Improve dramatic pacing

- Assign bundle roles before generation:
  - opener
  - first contradiction
  - convergence
  - final elimination
- Generate unlock cards from those roles so each bundle changes the story in a distinct way.

## Acceptance Criteria

The upgraded system should satisfy all of these:

- No puzzle card visibly contains its own answer.
- Bundle graph longest path is exactly 4 for a 4-bundle run.
- Bundle 001 does not fan out to every later bundle by default.
- Final bundle is Act 3.
- At least one bundle explicitly eliminates a suspect.
- At least one bundle explicitly proves access or breaks an alibi.
- No `solution_summary` is only a person name.
- Unlock cards reveal concrete new facts, not vague confirmation text.
- Gate cards are inspectable artifacts rather than summary accusations.

## Recommendation

Do not treat the current run as a chain failure. Treat it as a pacing and payoff failure.

The next upgrade should focus on:

1. banning visible solution leakage
2. simplifying the graph to a linear staged chain
3. making bundle outcomes concrete state changes
4. forcing Act 3 final escalation

That will improve actual playability more than adding more graph complexity.

## Implementation Phases

### Phase 1. Hard Gameplay Blockers

Do these first:

- Task Group 1. Stop answer leakage
- Task Group 2. Force linear chain shape
- Task Group 3. Enforce act and difficulty escalation
- Task Group 5. Strengthen the opener
- Task Group 9. Add pacing-focused QA

Phase 1 goal:

- no visible answer leakage
- no fan-out chain shape
- guaranteed Act 3 climax
- stronger opener
- fail-fast pacing validation

### Phase 2. Make Bundles Change The Board

Do these second:

- Task Group 4. Require explicit state-change outcomes
- Task Group 4.5. Require outcome progression
- Task Group 6. Make unlock cards concrete discoveries
- Task Group 7. Improve bundle role diversity

Phase 2 goal:

- each bundle changes investigation state in a distinct way
- unlocks feel like discoveries rather than commentary
- repeated “same suspect again” progression is reduced

### Phase 3. Improve Evidence Writing Quality

Do this last:

- Task Group 8. Upgrade evidence-card quality

Phase 3 goal:

- evidence cards become stronger game artifacts on top of the stricter pacing contract

## Implementation Task List

### Task Group 1. Stop answer leakage

- Add a validator that rejects any puzzle card whose visible `card_contents` contains `Solution:`.
- Add a validator that rejects any puzzle card whose visible `card_contents` substantially duplicates `solution`.
- Add a validator that rejects visible puzzle text that directly names the solved suspect unless the card is an explicit final accusation artifact.
- Add regression coverage with fixture cases for leaked solution text.

### Task Group 2. Force linear chain shape

- Change bundle generation so bundle `N` may depend only on bundle `N-1` by default.
- Remove broad reuse of earlier unlock refs during puzzle generation.
- Tighten bundle-linking logic so it cannot create `A -> C` or `A -> D` edges in the normal 4-bundle flow.
- Update connectivity validation to require a simple staged path for standard runs.
- Add a regression test that fails if early bundles have out-degree greater than `1`.

### Task Group 3. Enforce act and difficulty escalation

- Hard-code default puzzle acts:
  - bundle 1 -> Act 1
  - bundle 2 -> Act 2
  - bundle 3 -> Act 2
  - bundle 4 -> Act 3
- Update puzzle generation prompts so later bundles know their intended dramatic role.
- Replace “all bundles hard” behavior with role-based difficulty targets.
- Add a final invariant that rejects runs with no Act 3 puzzle climax.

### Task Group 4. Require explicit state-change outcomes

- Replace freeform outcome intent with a required bundle outcome type:
  - `eliminate_suspect`
  - `break_alibi`
  - `prove_access`
  - `link_object`
  - `reveal_location`
- Make each puzzle bundle emit exactly one declared state-change type.
- Validate that `actionable_gain` and `solution_summary` match the declared outcome type.
- Reject generic payoff text like “narrows suspicion” or “confirms suspicion” unless backed by a concrete state change.
- Add a test corpus of weak outcome phrases that must fail validation.

Implementation note:

- `outcome_type` should be a required enum on the bundle, not inferred from text.

### Task Group 4.5. Require outcome progression

For a standard 4-bundle run, require this shape:

- bundle 1: `prove_access` or `eliminate_suspect`
- bundle 2: `break_alibi` or `link_object`
- bundle 3: convergence-style hard narrowing
- bundle 4: final-proof-equivalent state change

Validation goals:

- outcome typing must not be valid-but-flat
- consecutive bundles should not feel like the same deduction repeated
- the final bundle must function as a climax rather than another intermediate confirmation

### Task Group 5. Strengthen the opener

- Add a bundle-1-specific rule requiring the opener to either prove exclusive access or eliminate one suspect path.
- Reject opener bundles whose `solution_summary` is only a suspect name.
- Add a validator that bundle 1 must materially change the investigation board.
- Add regression tests for weak openers.

### Task Group 6. Make unlock cards concrete discoveries

- Rewrite unlock generation prompts so unlock cards must describe a discoverable fact, not an editorial conclusion.
- Add validation to reject unlock text that only says “confirmed”, “exclusive opportunity”, or “narrows suspect list”.
- Require unlocks to expose one concrete artifact-level reveal such as:
  - timestamp contradiction
  - access log mismatch
  - fiber or residue match
  - tampering order
  - route impossibility
- Add fixtures for good versus bad unlock card wording.

### Task Group 7. Improve bundle role diversity

- Assign each bundle a narrative role before generation:
  - opener
  - contradiction
  - convergence
  - final proof
- Map allowed puzzle outcome types to those roles.
- Prevent repeated role/output combinations like “prove Lila opportunity” in multiple consecutive bundles.
- Add validation that adjacent bundles cannot produce substantively identical state changes.

Implementation note:

- add an adjacency validator:
  - the same `outcome_type` cannot appear in consecutive bundles
  - the same suspect-focus cannot appear in consecutive bundles unless the later bundle escalates from `prove_access` to a final-proof role

### Task Group 8. Upgrade evidence-card quality

- Introduce evidence templates by puzzle type:
  - access log
  - timestamp ledger
  - route map
  - witness discrepancy
  - forensic comparison
  - tampering artifact
- Bias generation toward raw inspectable evidence instead of summary conclusions.
- Add validators to detect evidence cards that are abstract accusation rather than observable artifact.
- Expand harness coverage with bundle examples that should pass only when cards are concrete.

### Task Group 9. Add pacing-focused QA

- Add a post-generation pacing audit that checks:
  - chain shape
  - act escalation
  - difficulty escalation
  - state-change diversity
  - unlock concreteness
  - opener strength
- Fail the artifact on critical pacing violations, not just warn.
- Write one golden-run evaluation script that reports bundle-by-bundle dramatic progression.

### Suggested Execution Order

1. Implement visible solution leakage rejection.
2. Enforce linear chain shape.
3. Enforce act escalation and final Act 3 bundle.
4. Strengthen bundle 1 opener rules.
5. Add pacing QA and fail-on-violation checks.
6. Add required state-change outcome types.
7. Add required outcome progression rules.
8. Rewrite unlock cards as concrete discoveries.
9. Add bundle role diversity rules.
10. Improve evidence templates and evidence validation.

## Additional Implementation Notes

### Leakage checks should be layered

- reject literal `Solution:`
- reject normalized substring overlap with the solved answer
- reject solved-suspect name leakage unless `bundle_role === "final_proof"` and the card is explicit accusation content

### Chain enforcement should exist in two places

- generation: bundle `N` only receives unlock from `N-1`
- validation: require the exact staged path for standard 4-bundle runs

### Unlock writing should ban editorial-only phrasing

Bad:

- `confirms opportunity`
- `narrows suspect list`
- `exclusive access confirmed`

Good:

- `booth access key was returned at 10:07 PM, seven minutes after Max entered`
- `ledger shows the rare-room key signed out under L.G. at 9:48 PM`
- `coat fibers on the sleeve match the fringe on Lila's stage jacket`

### Pacing audit output should include both machine and human layers

The audit should emit:

- machine pass/fail
- short human-readable report per bundle with:
  - role
  - act
  - difficulty
  - upstream dependency
  - outcome type
  - concrete unlock fact
  - board-state change
