import {
  collectFactBindingsFromReachableSolutions,
  expandReachableThroughPuzzles,
  findMissingTruthBindings,
  getInitiallyReachableCardIds
} from '../utils/truthTrailReachability.js';

export async function truthTrailValidatorAgent(context) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];

  const initial = getInitiallyReachableCardIds(cards);
  const reachable = expandReachableThroughPuzzles(cards, initial);
  const bindings = collectFactBindingsFromReachableSolutions(cards, reachable);
  const missing = findMissingTruthBindings(bindings);

  context.truth_trail = {
    initial_reachable_count: initial.size,
    reachable_count: reachable.size,
    fact_bindings_reachable: [...bindings].sort(),
    missing_fact_bindings: missing
  };

  if (missing.length) {
    throw new Error(
      'truth_trail_validator_agent: missing reachable fact_binding(s): ' +
      `${missing.join(', ')}. ` +
      'Expected each of killer, location, treasure_object, treasure_location on reachable solution cards (meta.fact_binding).'
    );
  }

  return context;
}
