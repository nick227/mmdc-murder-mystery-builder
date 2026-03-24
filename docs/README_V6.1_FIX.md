
v6.1 schema fix

Fixes:
OpenAI requires:
- additionalProperties:false at root
- additionalProperties:false in nested objects

This patch fixes:
- story acts agent
- host speech agent
- player activity agent
