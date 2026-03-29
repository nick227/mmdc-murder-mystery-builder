# Current Status

Date: 2026-03-29

## Executive Summary

The pipeline is now MVP-stable for internal playtesting.

Operationally:
- runs complete reliably through structural preflight
- partial and failed runs persist usable diagnostics
- the main structural blockers that dominated earlier work are resolved

Quality-wise:
- Shakespeare regression is now at `2/3` passing on the tracked blocker set
- `early_suspect_collapse` is at `0/3`
- `underused_suspects` is at `0/3`
- `final_bundle_redundant_confirmation` is at `0/3`
- one residual blocker remains: `duplicate_evidence_weighting` in `1/3` runs

This is no longer a clue-target architecture problem. It is a narrow downstream evidence-cleanup issue.

## Latest Regression Signal

Latest Shakespeare batch:
- report: [shakespeare_regression_report.json](/C:/wamp64/www/runs/shakespeare-regression-1774765307725-kpyyve/shakespeare_regression_report.json)
- total runs: `3`
- passed runs: `2`
- failed runs: `1`

Tracked issue counts:
- `duplicate_evidence_weighting`: `1/3`
- `underused_suspects`: `0/3`
- `early_suspect_collapse`: `0/3`
- `final_bundle_redundant_confirmation`: `0/3`

Per-run summary:
- Run `1774765307741-746izf`: failed at `structural_preflight_agent` with `duplicate_evidence_weighting`
- Run `1774765437256-d6ew9e`: reached `structural_preflight_agent` with no tracked blocker failures
- Run `1774765568246-yunavf`: reached `structural_preflight_agent` with no tracked blocker failures

## What Is Stable Now

These areas are materially stabilized:

- victim reservation before roster finalization
- deterministic core-truth safety checks
- deterministic early clue-target generation for slots 1-3
- deterministic final bundle path
- post-clue dedup against clue targets, item facts, and clue-vs-clue canonical signatures
- suspect coverage gate with motive/access competition enforcement
- bounded retry and rejection logging in critical agents
- Shakespeare regression harness as the main quality signal

## What Is No Longer The Main Problem

These earlier blockers are now substantially resolved:

- clue-target suspect assignment drift
- early one-suspect collapse
- dead suspect slots as the dominant failure mode
- final bundle redundancy
- prompt-compliance instability as the main bottleneck

## Remaining Blocker

### Duplicate Evidence Weighting

One run in the latest batch still failed on `duplicate_evidence_weighting`.

Interpretation:
- the broad duplicate-evidence problem is mostly solved
- the remaining failure is a narrower canonical-signature case that survives the current dedup pass
- this is downstream cleanup, not upstream story-structure instability

## Recent Fixes That Moved The Needle

- Added parse retry resilience in [storyActsAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/storyActsAgent.js)
- Raised overweight-threshold calibration by one point in [suspectPressureMap.js](/C:/wamp64/www/mmdc2-dev-builder/src/utils/suspectPressureMap.js)
- Added clue-vs-clue canonical signature dedupe in [postClueDedupAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/postClueDedupAgent.js)
- Made bundle 4 deterministic in [puzzleAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/puzzleAgent.js)

## Recommended Next Work

Only one high-value cleanup remains before calling this cleaner than MVP:

1. Inspect the exact surviving duplicate-evidence cluster from the failed run.
2. Extend the post-clue dedup pass or structural signature normalization to remove that class deterministically.
3. Re-run the 3-run Shakespeare regression and verify `duplicate_evidence_weighting` drops to `0/3`.

Do not reopen clue-target architecture or prompt tuning unless a future regression proves they have become unstable again.

## Bottom Line

The pipeline is now stable enough to generate playable internal test stories.

Current state:
- orchestration: stable
- validation: useful and trustworthy
- clue-target structure: stable enough
- bundle progression: stable enough
- remaining risk: one residual duplicate-evidence outlier

This is no longer an open-ended stabilization effort. It is a targeted cleanup pass.
