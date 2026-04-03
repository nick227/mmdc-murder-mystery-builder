import { getCharacterCards } from './cards.js';
import { baseName } from './coreTruthChecks.js';

export function getCanonicalMurderStrings(coreTruth) {
  const m = coreTruth?.murder;
  return {
    killer: String(m?.killer || '').trim(),
    victim: String(m?.victim || '').trim(),
    location: String(m?.location || '').trim()
  };
}

export function getCanonicalSuspectBaseNameSet(context) {
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  if (suspects.length) {
    return new Set(
      suspects.map((s) => baseName(String(s?.name || s?.title || '').trim())).filter(Boolean)
    );
  }
  return new Set(
    getCharacterCards(context.cards || []).map((c) => baseName(String(c?.card_title || '').trim())).filter(Boolean)
  );
}

/** Ordered list for read-only prompt injection. */
export function getCanonicalSuspectBaseNames(context) {
  return [...getCanonicalSuspectBaseNameSet(context)];
}
