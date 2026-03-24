# v9 Overlay

Focus:
- fix suspect imbalance and redundancy at the source
- improve trail diversity through stronger generation prompts
- add a validator that enforces balance, contradiction, uniqueness, and knowledge partition before downstream card generation

Apply on top of v8.

## What v9 changes

### Better initial trail generation
The breadcrumb prompt now requires:
- each trail to spotlight a different suspect first
- each major suspect to be implicated at least once
- each major suspect to also receive at least one soft counterweight or uncertainty
- different evidence dimensions across steps
- stronger knowledge partition across the cast
- contradiction or tension between at least two accounts

### New validator pass
`trail_balance_validator_agent` checks:
- suspect distribution
- uniqueness of discoveries / objects / implications
- knowledge partition by character
- contradiction presence
- overfocus on one suspect

If weak, it rewrites the trails before any card generation.

## Goal
Create stronger mystery structure before cards are written, so downstream agents inherit better raw material.
