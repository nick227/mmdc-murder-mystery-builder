/**
 * Truth-trail coverage: deterministic reachability over puzzle gates + fact_binding on solution cards.
 * No text analysis — only card graph + meta.fact_binding.
 */

export const FACT_BINDING_ORDER = ['killer', 'location', 'treasure_object', 'treasure_location'];

export const ALLOWED_FACT_BINDINGS = new Set(FACT_BINDING_ORDER);

export function isAllowedFactBinding(value) {
  const v = String(value || '').trim();
  return ALLOWED_FACT_BINDINGS.has(v);
}

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
 * Expand reachability with diagnostics: fixpoint wave count + first puzzle-wave index per card
 * (0 = surface / initial reachability).
 */
export function expandReachableWithDiagnostics(cards, initialReachable) {
  const reachable = new Set(initialReachable);
  const firstSeenIteration = new Map();
  for (const id of reachable) {
    firstSeenIteration.set(id, 0);
  }

  const puzzles = (Array.isArray(cards) ? cards : []).filter((c) => c?.card_type === 'puzzle');
  let fixpointIterations = 0;
  let changed = true;
  while (changed) {
    changed = false;
    fixpointIterations += 1;
    for (const puzzle of puzzles) {
      const required = Array.isArray(puzzle.required_card_ids) ? puzzle.required_card_ids : [];
      const unlocks = Array.isArray(puzzle.unlock_card_ids) ? puzzle.unlock_card_ids : [];
      if (!required.length || !unlocks.length) {
        continue;
      }
      if (!required.every((id) => reachable.has(id))) {
        continue;
      }
      for (const uid of unlocks) {
        const id = String(uid || '').trim();
        if (id && !reachable.has(id)) {
          reachable.add(id);
          firstSeenIteration.set(id, fixpointIterations);
          changed = true;
        }
      }
    }
  }

  return { reachable, fixpointIterations, firstSeenIteration };
}

/**
 * Expand reachability: when a puzzle's required_card_ids ⊆ reachable, add its unlock_card_ids.
 * Fixpoint until stable.
 */
export function expandReachableThroughPuzzles(cards, initialReachable) {
  return expandReachableWithDiagnostics(cards, initialReachable).reachable;
}

export function collectPuzzlesWithEmptyRequirements(cards) {
  const bad = [];
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.card_type !== 'puzzle') {
      continue;
    }
    const required = Array.isArray(card.required_card_ids) ? card.required_card_ids : [];
    const unlocks = Array.isArray(card.unlock_card_ids) ? card.unlock_card_ids : [];
    if (unlocks.length && required.length === 0) {
      bad.push(String(card.card_id || '').trim() || '(no id)');
    }
  }
  return bad;
}

/**
 * Truth-bound solution cards must be puzzle-gated (not on the surface) and stay hidden until solved.
 */
export function collectUngatedTruthSolutions(cards, initialReachable) {
  const initial = initialReachable instanceof Set ? initialReachable : new Set(initialReachable);
  const bad = [];
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.card_type !== 'solution') {
      continue;
    }
    const fb = card?.meta?.fact_binding;
    if (typeof fb !== 'string' || !fb.trim()) {
      continue;
    }
    const id = String(card.card_id || '').trim();
    if (!id) {
      continue;
    }
    const reasons = [];
    if (initial.has(id)) {
      reasons.push('reachable_without_puzzle');
    }
    if (card.hidden_until_solved !== true) {
      reasons.push('not_hidden_until_solved');
    }
    if (reasons.length) {
      bad.push({ card_id: id, fact_binding: fb.trim(), reasons });
    }
  }
  return bad;
}

export function mapBindingToFirstIteration(cards, firstSeenIteration) {
  const out = {};
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.card_type !== 'solution') {
      continue;
    }
    const fb = card?.meta?.fact_binding;
    if (typeof fb !== 'string' || !ALLOWED_FACT_BINDINGS.has(fb.trim())) {
      continue;
    }
    const id = String(card.card_id || '').trim();
    if (!id || !firstSeenIteration.has(id)) {
      continue;
    }
    out[fb.trim()] = firstSeenIteration.get(id);
  }
  return out;
}

/**
 * One puzzle fires per sweep (card order); step index when each unlock first appears.
 * Use for depth reporting — parallel fixpoint can unlock everything in one outer iteration.
 */
export function computeSequentialUnlockSteps(cards, initialReachable) {
  const reachable = new Set(initialReachable);
  const firstSeen = new Map();
  for (const id of reachable) {
    firstSeen.set(id, 0);
  }

  const puzzles = (Array.isArray(cards) ? cards : []).filter((c) => c?.card_type === 'puzzle');
  const fired = new Set();
  let step = 0;
  let progress = true;
  while (progress) {
    progress = false;
    for (const puzzle of puzzles) {
      const pid = String(puzzle.card_id || '').trim();
      if (!pid || fired.has(pid)) {
        continue;
      }
      const required = Array.isArray(puzzle.required_card_ids) ? puzzle.required_card_ids : [];
      const unlocks = Array.isArray(puzzle.unlock_card_ids) ? puzzle.unlock_card_ids : [];
      if (!required.length || !unlocks.length) {
        continue;
      }
      if (!required.every((id) => reachable.has(id))) {
        continue;
      }
      step += 1;
      fired.add(pid);
      for (const uid of unlocks) {
        const id = String(uid || '').trim();
        if (id && !reachable.has(id)) {
          reachable.add(id);
          firstSeen.set(id, step);
          progress = true;
        }
      }
      break;
    }
  }

  return { firstSeenIteration: firstSeen, sequential_puzzle_steps: step, puzzles_fired: fired.size };
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
