# Current Status

Date: 2026-03-29

## Executive Summary

The Shakespeare pipeline is now substantially stabilized.

Current real signal:
- latest 5-run regression: `5/5` runs reached full playtest-ready status
- tracked structural issue counts are all `0/5`
- `one_suspect_gravity`: `0/5`
- `underused_suspects`: `0/5`
- `early_suspect_collapse`: `0/5`
- `final_bundle_redundant_confirmation`: `0/5`
- `duplicate_evidence_weighting`: `0/5`

This is no longer a structural preflight or core-truth stability problem in the latest batch.

## Latest Regression Signal

Latest Shakespeare batch:
- report: [shakespeare_regression_report.json](/C:/wamp64/www/runs/shakespeare-regression-1774829419816-arv0pl/shakespeare_regression_report.json)
- total runs: `5`
- passed runs: `5`
- failed runs: `0`

Tracked issue counts:
- `duplicate_evidence_weighting`: `0/5`
- `underused_suspects`: `0/5`
- `one_suspect_gravity`: `0/5`
- `early_suspect_collapse`: `0/5`
- `final_bundle_redundant_confirmation`: `0/5`

Per-run summary:
- Run `1774829419872-53pw9n`: pass
- Run `1774829548232-sdbfba`: pass
- Run `1774829644120-yix2po`: pass
- Run `1774829764180-njyua8`: pass
- Run `1774829884161-njyx1s`: pass

## What Is Actually Stable Now

These areas are materially improved and holding:

- clue cards preserve `suspect_name`
- clue generation has deterministic per-player volume and stronger upstream balancing guidance
- clue-vs-clue canonical dedupe is active in [postClueDedupAgent.js](/C:/wamp64/www/mmdc2-dev-builder/src/agents/postClueDedupAgent.js)
- cross-agent duplicate detection is retired; duplicate checks are now type-isolated
- `puzzleAgent` no longer depends on deleted `context.clue_targets`
- structural preflight no longer relies on deleted clue-target scaffolding
- clue pressure in [structuralPreflight.js](/C:/wamp64/www/mmdc2-dev-builder/src/utils/structuralPreflight.js) is now based on `suspect_name` and `clue_weight`, not clue-body text scanning
- suspect coverage now counts signal hooks from character profiles in addition to secrets and narratives
- reserved-victim exclusion is explicitly pushed into character generation retries
- `core_truth_agent` now enforces reserved-victim identity and alternate-killer exclusion inline, with bounded retries
- evidence signature handling is much stricter about whole words, composite object phrases, and name/object collisions
- bundle metadata is no longer canonicalized as evidence in [factLedger.js](/C:/wamp64/www/mmdc2-dev-builder/src/utils/factLedger.js)

## Guardrails Added

Focused tests now cover the recent fixes:

- [clueAgentUnitTest.js](/C:/wamp64/www/mmdc2-dev-builder/src/tests/clueAgentUnitTest.js)
- [evidenceCanonicalizationTest.js](/C:/wamp64/www/mmdc2-dev-builder/src/tests/evidenceCanonicalizationTest.js)
- [charactersBuilderPromptGuardrailTest.js](/C:/wamp64/www/mmdc2-dev-builder/src/tests/charactersBuilderPromptGuardrailTest.js)
- [suspectCoverageTest.js](/C:/wamp64/www/mmdc2-dev-builder/src/tests/suspectCoverageTest.js)
- [structuralPreflightTest.js](/C:/wamp64/www/mmdc2-dev-builder/src/tests/structuralPreflightTest.js)

These now explicitly cover:
- `Quillan` / `Quill` name collisions
- `Cryptic Sonnet` vs `First Folio`
- `quill case` and `quill and parchment` composite titles
- reserved-victim prompt exclusion
- profile-driven access hooks in suspect coverage

## Remaining Open Gap

There is no current tracked blocker in the latest 5-run batch.

If additional work continues, it should be proactive hardening rather than reactive stabilization:
- widen the sample beyond `5` runs to confirm the pass rate holds
- add a focused unit test around `coreTruthAgent` retry behavior
- keep future cleanup scoped so the current duplicate/preflight contract does not drift again

## Bottom Line

Current state:
- orchestration: stable
- structural preflight: clean in the latest batch
- core truth generation: clean in the latest batch
- clue balance: materially fixed
- suspect coverage: materially fixed
- victim-roster leakage: guarded
- remaining gap: none in the latest 5-run sample

This is now in maintenance mode rather than active stabilization.
