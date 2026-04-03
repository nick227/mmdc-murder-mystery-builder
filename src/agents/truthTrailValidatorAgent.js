import {
  collectFactBindingsFromReachableSolutions,
  collectPuzzlesWithEmptyRequirements,
  collectUngatedTruthSolutions,
  computeSequentialUnlockSteps,
  expandReachableWithDiagnostics,
  findMissingTruthBindings,
  getInitiallyReachableCardIds,
  mapBindingToFirstIteration
} from '../utils/truthTrailReachability.js';

function parseEnvInt(name) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export async function truthTrailValidatorAgent(context) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];

  const emptyReq = collectPuzzlesWithEmptyRequirements(cards);
  if (emptyReq.length) {
    throw new Error(
      `truth_trail_validator_agent: puzzle(s) have unlocks but empty required_card_ids: ${emptyReq.join(', ')}`
    );
  }

  const initial = getInitiallyReachableCardIds(cards);
  const ungated = collectUngatedTruthSolutions(cards, initial);
  if (ungated.length) {
    throw new Error(
      `truth_trail_validator_agent: truth solution cards must be hidden and not surface-reachable:\n${JSON.stringify(ungated, null, 2)}`
    );
  }

  const { reachable, fixpointIterations } = expandReachableWithDiagnostics(cards, initial);
  const bindings = collectFactBindingsFromReachableSolutions(cards, reachable);
  const missing = findMissingTruthBindings(bindings);

  const sequential = computeSequentialUnlockSteps(cards, initial);
  const bindingFirstIteration = mapBindingToFirstIteration(cards, sequential.firstSeenIteration);

  context.truth_trail = {
    initial_reachable_count: initial.size,
    reachable_count: reachable.size,
    fixpoint_iterations: fixpointIterations,
    sequential_puzzle_steps: sequential.sequential_puzzle_steps,
    fact_bindings_reachable: [...bindings].sort(),
    binding_first_iteration: bindingFirstIteration,
    missing_fact_bindings: missing
  };

  if (missing.length) {
    throw new Error(
      'truth_trail_validator_agent: missing reachable fact_binding(s): ' +
      `${missing.join(', ')}. ` +
      'Expected each of killer, location, treasure_object, treasure_location on reachable solution cards (meta.fact_binding).'
    );
  }

  const minFix = parseEnvInt('TRUTH_TRAIL_MIN_FIXPOINT_ITERATIONS');
  if (minFix >= 1 && fixpointIterations < minFix) {
    throw new Error(
      `truth_trail_validator_agent: fixpoint_iterations ${fixpointIterations} < TRUTH_TRAIL_MIN_FIXPOINT_ITERATIONS ${minFix}`
    );
  }

  const murderMin = parseEnvInt('TRUTH_TRAIL_MURDER_MIN_ITERATION');
  if (murderMin >= 1) {
    for (const key of ['killer', 'location']) {
      const wave = bindingFirstIteration[key];
      if (wave === undefined || wave < murderMin) {
        throw new Error(
          `truth_trail_validator_agent: binding "${key}" first seen at sequential step ${wave}, ` +
          `requires >= TRUTH_TRAIL_MURDER_MIN_ITERATION (${murderMin})`
        );
      }
    }
  }

  const minSeq = parseEnvInt('TRUTH_TRAIL_MIN_SEQUENTIAL_STEPS');
  if (minSeq >= 1 && sequential.sequential_puzzle_steps < minSeq) {
    throw new Error(
      `truth_trail_validator_agent: sequential_puzzle_steps ${sequential.sequential_puzzle_steps} < ` +
      `TRUTH_TRAIL_MIN_SEQUENTIAL_STEPS (${minSeq})`
    );
  }

  return context;
}
