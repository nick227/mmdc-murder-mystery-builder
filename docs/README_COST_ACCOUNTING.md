# Cost Accounting Overlay

Adds per-run LLM usage accounting to the final output JSON.

## What it records
- total request count
- per-request prompt / completion / total tokens
- request type (`text` vs `json`)
- schema name (when present)
- model name
- step name
- per-run totals

## Output shape
The final `result.json` will include:

```json
{
  "costAccounting": {
    "runId": "...",
    "requestCount": 12,
    "requests": [
      {
        "index": 1,
        "runId": "...",
        "stepName": "story_blurb_agent",
        "requestType": "text",
        "schemaName": null,
        "model": "gpt-4.1-mini",
        "prompt_tokens": 123,
        "completion_tokens": 245,
        "total_tokens": 368,
        "created_at": "2026-03-23T..."
      }
    ],
    "totals": {
      "prompt_tokens": 1234,
      "completion_tokens": 2345,
      "total_tokens": 3579
    }
  }
}
```

Overlay-safe: only modified / new files are included.
