import { getCharacterCards } from './cards.js';
import { baseName, suspectRosterKey } from './coreTruthChecks.js';

function addSuspectRosterAliases(set, raw) {
  const n = String(raw || '').trim();
  if (!n) {
    return;
  }
  const b = baseName(n);
  if (b) {
    set.add(b);
  }
  const k = suspectRosterKey(n);
  if (k) {
    set.add(k);
  }
}

export function getCanonicalMurderStrings(coreTruth) {
  const m = coreTruth?.murder;
  return {
    killer: String(m?.killer || '').trim(),
    victim: String(m?.victim || '').trim(),
    location: String(m?.location || '').trim()
  };
}

export function getCanonicalSuspectBaseNameSet(context) {
  const set = new Set();
  const suspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  if (suspects.length) {
    for (const s of suspects) {
      addSuspectRosterAliases(set, String(s?.name || s?.title || '').trim());
    }
    return set;
  }
  for (const c of getCharacterCards(context.cards || [])) {
    addSuspectRosterAliases(set, String(c?.card_title || '').trim());
  }
  return set;
}

/** Ordered list for read-only prompt injection. */
export function getCanonicalSuspectBaseNames(context) {
  return [...getCanonicalSuspectBaseNameSet(context)];
}
