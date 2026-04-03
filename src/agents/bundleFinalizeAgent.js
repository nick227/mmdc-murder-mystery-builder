import crypto from 'node:crypto';

import { pushCards } from '../utils/cards.js';
import { getMurderCanonRef } from '../utils/canonFacts.js';
import { FACT_BINDING_ORDER, isAllowedFactBinding } from '../utils/truthTrailReachability.js';

const VALID_ACTS = new Set([1, 2, 3]);
const DEFAULT_ACT = 2;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeAct(value, fallback = DEFAULT_ACT) {
  return VALID_ACTS.has(value) ? value : fallback;
}

function resolveRefs(refs, localRefToId, externalRefToId, bundleId, label) {
  return refs.map((ref) => {
    const resolved = localRefToId.get(ref) || externalRefToId.get(ref);
    assert(resolved, `Bundle ${bundleId} has unresolved ${label} ${ref}`);
    return resolved;
  });
}

/** Prefer clue_target.fact_binding; index fallback only when unset (backward compat). */
function resolveFactBindingForBundle(clueTarget, bundleIndex) {
  const explicit = String(clueTarget?.fact_binding || '').trim();
  if (explicit) {
    if (!isAllowedFactBinding(explicit)) {
      throw new Error(
        `bundle_finalize_agent: invalid fact_binding "${explicit}" (expected one of: ${FACT_BINDING_ORDER.join(', ')})`
      );
    }
    return explicit;
  }
  if (bundleIndex >= 0 && bundleIndex < FACT_BINDING_ORDER.length) {
    return FACT_BINDING_ORDER[bundleIndex];
  }
  return null;
}

function toInternalCards(rawCards, bundleIndex, frozenSolutionFact, factBinding) {
  const list = Array.isArray(rawCards) ? rawCards : [];
  const puzzle = list.find((c) => c?.card_type === 'puzzle') || null;
  const solution = list.find((c) => c?.card_type === 'solution') || null;
  const evidence = list.filter((c) => c?.card_type === 'evidence');

  assert(puzzle, `bundle_finalize_agent bundle ${bundleIndex + 1} missing puzzle card`);
  assert(solution, `bundle_finalize_agent bundle ${bundleIndex + 1} missing solution card`);

  const evidenceCards = evidence.map((card, idx) => ({
    card_ref: `bundle_${bundleIndex + 1}_evidence_${String(idx + 1).padStart(3, '0')}`,
    card_type: 'clue',
    card_title: String(card?.card_title || `Evidence ${idx + 1}`).trim(),
    card_contents: String(card?.card_contents || '').trim(),
    hidden_until_solved: false
  }));

  const solutionText = String(frozenSolutionFact || '').trim() || String(solution?.card_contents || '').trim();

  const solutionCard = {
    card_ref: `bundle_unlock_${String(bundleIndex + 1).padStart(3, '0')}`,
    card_type: 'solution',
    card_title: String(solution?.card_title || `Clue ${bundleIndex + 1}`).trim(),
    card_contents: solutionText,
    hidden_until_solved: true,
    meta: factBinding ? { fact_binding: String(factBinding).trim() } : undefined
  };

  const puzzleCard = {
    card_ref: `bundle_${bundleIndex + 1}_puzzle`,
    card_type: 'puzzle',
    card_title: String(puzzle?.card_title || `Puzzle ${bundleIndex + 1}`).trim(),
    card_contents: String(puzzle?.card_contents || '').trim(),
    hidden_until_solved: false,
    unlocked_item: typeof puzzle?.unlocked_item === 'string' ? puzzle.unlocked_item : undefined
  };

  return [...evidenceCards, solutionCard, puzzleCard];
}

export function flattenBundle(bundleDraft, index, externalRefToId = new Map(), murderCanonRef = null) {
  const bundleId = String(bundleDraft?.bundle_id || '').trim() || `puzzle_bundle_${String(index + 1).padStart(3, '0')}`;
  const clueTarget = bundleDraft?.clue_target || null;
  const puzzleType = String(
    clueTarget?.puzzle_type_hint
    || bundleDraft?.puzzle_type
    || ''
  ).trim() || 'cross_reference';
  const defaultAct = normalizeAct(clueTarget?.act, DEFAULT_ACT);
  const frozenFact = String(clueTarget?.fact || '').trim();
  const factBinding = resolveFactBindingForBundle(clueTarget, index);

  const cards = toInternalCards(bundleDraft?.cards, index, frozenFact, factBinding);
  const localRefToId = new Map();

  for (const card of cards) {
    const ref = String(card.card_ref || '').trim();
    assert(ref, `Bundle ${bundleId} has card without card_ref`);
    assert(!localRefToId.has(ref), `Bundle ${bundleId} has duplicate card_ref ${ref}`);
    localRefToId.set(ref, crypto.randomUUID());
  }

  const emittedCards = cards.map((card) => {
    const cardRef = String(card.card_ref || '').trim();
    const cardId = localRefToId.get(cardRef);
    const base = {
      card_id: cardId,
      card_ref: cardRef,
      card_type: card.card_type,
      card_title: String(card.card_title || '').trim(),
      card_contents: String(card.card_contents || '').trim(),
      act: defaultAct,
      bundle_id: bundleId,
      hidden_until_solved: card.card_type === 'solution' ? true : card.hidden_until_solved === true
    };
    if (card.meta && typeof card.meta === 'object') {
      base.meta = card.meta;
    }
    if (murderCanonRef && typeof murderCanonRef === 'object') {
      base.murder_canon = { ...murderCanonRef };
    }
    return base;
  });

  const puzzleCard = emittedCards.find((c) => c.card_type === 'puzzle') || null;
  const solutionCard = emittedCards.find((c) => c.card_type === 'solution') || null;
  assert(puzzleCard, `Bundle ${bundleId} missing puzzle card`);
  assert(solutionCard, `Bundle ${bundleId} missing solution card`);

  const localEvidenceRefs = cards
    .filter((card) => card.card_type === 'clue' && card.hidden_until_solved !== true)
    .map((card) => String(card.card_ref || '').trim())
    .filter(Boolean);
  const priorUnlockRef = index > 0 ? `bundle_unlock_${String(index).padStart(3, '0')}` : null;
  const requiredCardRefs = [...(priorUnlockRef ? [priorUnlockRef] : []), ...localEvidenceRefs];
  const unlockCardRefs = [String(cards.find((c) => c.card_type === 'solution')?.card_ref || '').trim()].filter(Boolean);

  puzzleCard.puzzle_type = puzzleType;
  puzzleCard.required_card_refs = requiredCardRefs;
  puzzleCard.unlock_card_refs = unlockCardRefs;
  puzzleCard.required_card_ids = resolveRefs(requiredCardRefs, localRefToId, externalRefToId, bundleId, 'required_card_ref');
  puzzleCard.unlock_card_ids = resolveRefs(unlockCardRefs, localRefToId, externalRefToId, bundleId, 'unlock_card_ref');

  return {
    bundle_id: bundleId,
    act: defaultAct,
    puzzle_type: puzzleType,
    clue_target: clueTarget,
    cards: emittedCards
  };
}

export async function bundleFinalizeAgent(context) {
  const drafts = Array.isArray(context?.puzzle_bundle_drafts) ? context.puzzle_bundle_drafts : [];
  if (!drafts.length) {
    return context;
  }

  const bundles = [];
  const knownRefToId = new Map();
  const murderCanonRef = getMurderCanonRef(context.coreTruth);

  for (let index = 0; index < drafts.length; index += 1) {
    const bundle = flattenBundle(drafts[index], index, knownRefToId, murderCanonRef);
    bundles.push(bundle);
    for (const card of bundle.cards) {
      if (card?.card_ref) {
        knownRefToId.set(card.card_ref, card.card_id);
      }
    }
  }

  context.puzzle_bundles = bundles.map((bundle) => ({
    bundle_id: bundle.bundle_id,
    act: bundle.act,
    puzzle_type: bundle.puzzle_type,
    clue_target: bundle.clue_target?.fact || null,
    card_ids: bundle.cards.map((card) => card.card_id)
  }));

  return pushCards(context, 'puzzle', bundles.flatMap((bundle) => bundle.cards));
}

