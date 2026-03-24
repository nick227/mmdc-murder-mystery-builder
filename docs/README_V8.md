# v8 Overlay

Focus:
- lock down trail leaks
- force implication instead of confirmation
- preserve a deduction gap between evidence and solution
- stop trails from acting like private answer cards

Apply on top of v7.

## Main changes
- stronger breadcrumb trail prompt with forbidden direct-solution language
- new trail schema fields to support uncertainty and deduction gap
- trail review agent to rewrite leaking or over-confirming trails
- pipeline updated to review trails before downstream card generation

## Goal
Downstream agents should receive structured discovery paths, not direct answer statements.
