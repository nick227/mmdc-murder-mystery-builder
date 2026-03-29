import { applyBundleDerivation, deriveBundleConclusion } from '../utils/bundleDerivation.js';

export async function bundleDerivationAgent(context) {
  const bundles = Array.isArray(context.puzzle_bundles) ? context.puzzle_bundles : [];
  const baseState = context?.case_state?.state_progression;

  if (!context?.case_state || !baseState) {
    throw new Error('bundle_derivation_agent: case_state.state_progression missing');
  }

  let currentState = {
    viable_suspects: [...(baseState.viable_suspects || [])],
    eliminated_suspects: [...(baseState.eliminated_suspects || [])],
    constraints: [...(baseState.constraints || [])]
  };

  bundles.forEach((bundle, index) => {
    const { conclusion, nextState } = deriveBundleConclusion({
      context,
      bundleId: bundle.bundle_id,
      bundleIndex: index,
      currentStateProgression: currentState
    });

    applyBundleDerivation({
      context,
      bundleId: bundle.bundle_id,
      bundleIndex: index,
      conclusion
    });

    currentState = nextState;
  });

  context.case_state.state_progression = currentState;
  return context;
}
