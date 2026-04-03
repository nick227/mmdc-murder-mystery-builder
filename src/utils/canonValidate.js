import { baseName } from './coreTruthChecks.js';
import { getCanonicalMurderStrings, getCanonicalSuspectBaseNameSet } from './canonFacts.js';

export function assertMurderClueSuspectNames(context) {
  const roster = getCanonicalSuspectBaseNameSet(context);
  if (roster.size === 0) {
    throw new Error('canon_validate: suspect roster is empty');
  }

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
    if (!roster.has(b)) {
      throw new Error(
        `canon_validate: suspect_name "${sn}" (base "${b}") is not in the playable roster`
      );
    }
  }
}

function draftVisibleBlob(draft) {
  const cards = Array.isArray(draft?.cards) ? draft.cards : [];
  const parts = [];
  for (const c of cards) {
    if (c?.card_type === 'solution') {
      continue;
    }
    parts.push(String(c?.card_title || ''), String(c?.card_contents || ''));
  }
  return parts.join('\n');
}

export function assertPuzzleDraftsMurderCanon(context) {
  const { victim, location } = getCanonicalMurderStrings(context.coreTruth);
  if (!victim || !location) {
    throw new Error('canon_validate: coreTruth.murder victim or location is empty');
  }

  const drafts = context.puzzle_bundle_drafts || [];
  for (let i = 0; i < drafts.length; i++) {
    const blob = draftVisibleBlob(drafts[i]);
    if (!blob.includes(victim)) {
      throw new Error(`canon_validate: puzzle draft ${i + 1} is missing the exact victim string from coreTruth`);
    }
    if (!blob.includes(location)) {
      throw new Error(`canon_validate: puzzle draft ${i + 1} is missing the exact location string from coreTruth`);
    }
  }
}

export function assertBundleVisibleMurderCanon(context) {
  const { victim, location } = getCanonicalMurderStrings(context.coreTruth);
  if (!victim || !location) {
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
    const parts = [];
    for (const c of [...visibleEvidence, ...puzzles]) {
      parts.push(String(c?.card_title || ''), String(c?.card_contents || ''));
    }
    const blob = parts.join('\n');
    if (!blob.includes(victim)) {
      throw new Error(`canon_validate: bundle ${bundleId} visible evidence/puzzle text is missing the exact victim string`);
    }
    if (!blob.includes(location)) {
      throw new Error(`canon_validate: bundle ${bundleId} visible evidence/puzzle text is missing the exact location string`);
    }
  }
}
