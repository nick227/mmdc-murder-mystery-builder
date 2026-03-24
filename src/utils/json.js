
// FIX: the old implementation had two gaps:
// 1. It didn't strip markdown code fences (```json ... ```) that models
//    occasionally emit even when instructed not to.
// 2. It only looked for a top-level object (`{...}`), so any response whose
//    root was a JSON array would always fall through to the error path.
// 3. Nested braces (e.g. "Here is JSON: {...}") could cause the slice to start
//    too late when the outer brace was part of prose, not JSON.
export function safeJson(text) {
  // Strip markdown code fences.
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // First attempt: parse the stripped text directly.
  try {
    return JSON.parse(stripped);
  } catch { /* fall through */ }

  // Second attempt: extract the first complete {...} or [...] block.
  // We try both and take whichever starts earlier in the string.
  const objStart = stripped.indexOf("{");
  const arrStart = stripped.indexOf("[");

  let start = -1;
  let endChar;
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart;
    endChar = "}";
  } else if (arrStart !== -1) {
    start = arrStart;
    endChar = "]";
  }

  if (start !== -1) {
    const end = stripped.lastIndexOf(endChar);
    if (end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch { /* fall through */ }
    }
  }

  throw new Error(
    `Failed to parse JSON from model response. ` +
    `First 120 chars: ${text.slice(0, 120)}`
  );
}
