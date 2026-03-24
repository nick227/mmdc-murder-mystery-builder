// Sealed context for all card-writing agents.
// Never exposes killer, murderMethod, realSequence, fortuneLocation, or true_narrative.
export function buildSealedNarrativeContext(context) {
  const publicNarratives = context.narratives
    ? {
        a: context.narratives.a,
        b: context.narratives.b,
        c: context.narratives.c
        // true_narrative is intentionally omitted
      }
    : undefined;

  if (!context.trails?.length) {
    throw new Error("No validated trails available in context. Cannot build sealed context.");
  }

  return {
    storyBlurb: context.storyBlurb,
    playerCount: context.playerCount,
    trails: context.trails,
    narratives: publicNarratives,
    cards: context.cards || []
  };
}

// Sealed solutions for card-writing agents that need minimal solution context.
// Only exposes the misleading assumption — never the answer key.
export function buildSealedSolutions(solutions) {
  if (!solutions) return undefined;
  return {
    misleadingAssumption: solutions.misleadingAssumption
  };
}

// Full truth context — only for solution_agent, narrative agents, and solvabilityValidatorAgent.
export function buildTruthContext(context) {
  return {
    storyBlurb: context.storyBlurb,
    solutions: context.solutions,
    trails: context.trails,
    narratives: context.narratives
  };
}

// Dynamically derive suspect names from narratives (replaces hardcoded name list).
export function getSuspectNames(narratives) {
  if (!narratives) return [];
  return [narratives.a?.suspect, narratives.b?.suspect, narratives.c?.suspect]
    .filter(Boolean)
    .map((name) => name.trim().toLowerCase());
}
