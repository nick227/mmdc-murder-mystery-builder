import { baseName, suspectRosterKey } from './coreTruthChecks.js';
import { getCanonicalMurderStrings, getCanonicalSuspectBaseNameSet, getMurderCanonRef } from './canonFacts.js';

export function assertMurderClueSuspectNames(context) {
  const roster = getCanonicalSuspectBaseNameSet(context);
  if (roster.size === 0) {
    throw new Error('canon_validate: suspect roster is empty');
  }

  const { victim } = getCanonicalMurderStrings(context.coreTruth);
  const victimNorm = victim ? baseName(victim) : '';
  const victimKey = victim ? suspectRosterKey(victim) : '';

  for (const card of context.cards || []) {
    if (card?.card_type !== 'clue') {
      continue;
    }
    if (String(card?.clue_type || '').trim().toLowerCase() === 'treasure') {
      continue;
    }
    if (card?.bundle_id) {
      continue;
    }

    const sn = String(card?.suspect_name || '').trim();
    if (!sn) {
      throw new Error(`canon_validate: murder clue "${card?.card_title || card?.card_id}" missing suspect_name`);
    }

    const b = baseName(sn);
    const key = suspectRosterKey(sn);
    if (roster.has(b) || roster.has(key)) {
      continue;
    }
    if (victim && (sn === victim || b === victimNorm || key === victimKey)) {
      continue;
    }
    throw new Error(
      `canon_validate: suspect_name "${sn}" (base "${b}") is not in the playable roster or canonical victim`
    );
  }
}

function murderCanonMatchesCard(card, expected) {
  const mc = card?.murder_canon;
  if (!mc || typeof mc !== 'object') {
    return false;
  }
  return (
    String(mc.victim || '').trim() === expected.victim
    && String(mc.location || '').trim() === expected.location
  );
}

export function assertPuzzleDraftsMurderCanon(context) {
  const expected = getMurderCanonRef(context.coreTruth);
  if (!expected.victim || !expected.location) {
    throw new Error('canon_validate: coreTruth.murder victim or location is empty');
  }

  const drafts = context.puzzle_bundle_drafts || [];
  for (let i = 0; i < drafts.length; i += 1) {
    const cards = Array.isArray(drafts[i]?.cards) ? drafts[i].cards : [];
    for (let j = 0; j < cards.length; j += 1) {
      const c = cards[j];
      const t = String(c?.card_type || '').trim();
      if (t === 'solution') {
        continue;
      }
      if (t !== 'evidence' && t !== 'puzzle') {
        continue;
      }
      if (!murderCanonMatchesCard(c, expected)) {
        throw new Error(
          `canon_validate: puzzle draft ${i + 1} card ${j + 1} (${t}) missing or invalid murder_canon (expected victim + location from coreTruth)`
        );
      }
    }
  }
}

export function assertBundleVisibleMurderCanon(context) {
  const expected = getMurderCanonRef(context.coreTruth);
  if (!expected.victim || !expected.location) {
    throw new Error('canon_validate: coreTruth.murder victim or location is empty');
  }

  const cards = context.cards || [];
  const bundleIds = [...new Set(cards.map((c) => c?.bundle_id).filter(Boolean))].sort();

  for (const bundleId of bundleIds) {
    const bundleCards = cards.filter((c) => c?.bundle_id === bundleId);
    const visibleEvidence = bundleCards.filter((c) =>
      (c?.card_type === 'clue' || c?.card_type === 'item')
      && c?.hidden_until_solved !== true
    );
    const puzzles = bundleCards.filter((c) => c?.card_type === 'puzzle');
    for (const c of [...visibleEvidence, ...puzzles]) {
      if (!murderCanonMatchesCard(c, expected)) {
        throw new Error(
          `canon_validate: bundle ${bundleId} card ${c?.card_type} ${c?.card_id || ''} missing or invalid murder_canon`
        );
      }
    }
  }
}
