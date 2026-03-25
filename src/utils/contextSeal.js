export function buildSealedNarrativeContext(context) {
  return {
    storyBlurb: context.story_blurb || context.storyBlurb || '',
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
    storyBlurb: context.story_blurb || context.storyBlurb || '',
    murder_truth: context.murder_truth || '',
    fortune_truth: context.fortune_truth || '',
    trails: context.trails || '',
    narratives: context.narratives || ''
  };
}

export function getSuspectNames() {
  return [];
}
