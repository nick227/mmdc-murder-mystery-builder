# Final Review Patch

Overlay-safe patch containing only modified files.

## Focus
- reduce wasted tokens in `card_quality_agent`
- skip unnecessary quality pass on tiny card sets
- enforce act coverage and contradiction coverage in `finalEditorAgent`
- reduce prompt size by passing a compact narrative summary into `card_quality_agent`

## Notes
This patch is intentionally conservative:
- no pipeline restructuring
- no schema migrations
- no new agent steps
- no quality reduction
