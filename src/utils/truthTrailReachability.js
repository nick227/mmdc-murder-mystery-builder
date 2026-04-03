/**
 * Truth-trail coverage: deterministic reachability over puzzle gates + fact_binding on solution cards.
 * No text analysis — only card graph + meta.fact_binding.
 */

export const FACT_BINDING_ORDER = ['killer', 'location', 'treasure_object', 'treasure_location'];

/**
 * Cards obtainable without solving a puzzle (nothing with hidden_until_solved === true).
 */
export function getInitiallyReachableCardIds(cards) {
  const ids = new Set();
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.hidden_until_solved === true) {
      continue;
    }
    const id = String(card?.card_id || '').trim();
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Expand reachability: when a puzzle's required_card_ids ⊆ reachable, add its unlock_card_ids.
 * Fixpoint until stable.
 */
export function expandReachableThroughPuzzles(cards, initialReachable) {
  const reachable = new Set(initialReachable);
  const puzzles = (Array.isArray(cards) ? cards : []).filter((c) => c?.card_type === 'puzzle');

  let changed = true;
  while (changed) {
    changed = false;
    for (const puzzle of puzzles) {
      const required = Array.isArray(puzzle.required_card_ids) ? puzzle.required_card_ids : [];
      const unlocks = Array.isArray(puzzle.unlock_card_ids) ? puzzle.unlock_card_ids : [];
      if (!required.length || !unlocks.length) {
        continue;
      }
      const allRequiredMet = required.every((id) => reachable.has(id));
      if (!allRequiredMet) {
        continue;
      }
      for (const uid of unlocks) {
        const id = String(uid || '').trim();
        if (id && !reachable.has(id)) {
          reachable.add(id);
          changed = true;
        }
      }
    }
  }
  return reachable;
}

export function collectFactBindingsFromReachableSolutions(cards, reachableIds) {
  const bindings = new Set();
  const reachable = reachableIds instanceof Set ? reachableIds : new Set(reachableIds);

  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.card_type !== 'solution') {
      continue;
    }
    const id = String(card?.card_id || '').trim();
    if (!id || !reachable.has(id)) {
      continue;
    }
    const fb = card?.meta?.fact_binding;
    if (typeof fb === 'string' && fb.trim()) {
      bindings.add(fb.trim());
    }
  }
  return bindings;
}

export function findMissingTruthBindings(reachableBindings) {
  const have = reachableBindings instanceof Set ? reachableBindings : new Set(reachableBindings);
  const missing = [];
  for (const key of FACT_BINDING_ORDER) {
    if (!have.has(key)) {
      missing.push(key);
    }
  }
  return missing;
}
