# v5 Overlay

Apply this overlay on top of v4.

## Focus of v5
- Hardened breadcrumb trail dependency graph
- Stronger character identity generation
- Card quality scoring and rewrite pass
- Better coherence and relevance targeting

## New / changed files
- `src/prompts/trailsPrompt.js`
- `src/schemas/trailsSchema.js`
- `src/prompts/characterProfilesPrompt.js`
- `src/prompts/cardQualityPrompt.js`
- `src/schemas/reviewedCardsSchema.js`
- `src/agents/cardQualityAgent.js`
- `src/pipeline/steps/index.js`

## Notes
The new trail schema adds:
- `step_id`
- `requires_step`
- `reveals`
- `relevance`

This makes downstream clues, items, puzzles, and interaction cards much more targeted.
