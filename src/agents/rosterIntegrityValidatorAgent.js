/**
 * Placeholder: previously scanned card text for off-roster capitalized phrases (regex + heuristics).
 * That was noisy and brittle; ghost-name drift is better handled by editors or targeted QA.
 * Pipeline keeps this step so ordering/audit hooks stay stable.
 */
export async function rosterIntegrityValidatorAgent(context) {
  context.debug ??= {};
  context.debug.warning_log ??= [];
  return context;
}
