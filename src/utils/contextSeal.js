export function buildSealedNarrativeContext(context) {
  return {
    storyBlurb: context.storyBlurb || '',
    playerCount: context.playerCount,
    trails: context.trails || '',
    narratives: context.narratives || '',
    cards: context.cards || []
  };
}

export function buildSealedSolutions() {
  return undefined;
}

export function buildTruthContext(context) {
  return {
    storyBlurb: context.storyBlurb || '',
    coreTruth: context.coreTruth || {},
    trails: context.trails || '',
    narratives: context.narratives || ''
  };
}

export function getSuspectNames() {
  return [];
}
