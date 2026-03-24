
# v5 CLI Debug Overlay

This version prints:

- step dividers
- system prompts
- user prompts
- schemas
- raw model responses
- parsed JSON
- full step breakdown

Enable with:

DEBUG_PROMPTS=1

Output example:

════════════════════════════════
STEP 3/10 — breadcrumb_trail_agent
════════════════════════════════

---- SYSTEM PROMPT ----
...

---- USER PROMPT ----
...

---- SCHEMA ----
...

---- MODEL RESPONSE ----
...
