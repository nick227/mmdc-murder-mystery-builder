export function normalizeContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return context;
  }

  context.debug ??= {
    bundle_stats: [],
    rejection_log: [],
    warning_log: [],
    connectivity: [],
    gain_counts: {},
    strength_counts: {},
    state_change_flags: []
  };

  if (typeof context.storyBlurb !== 'string' && typeof context.story_blurb === 'string') {
    context.storyBlurb = context.story_blurb;
  }

  if (typeof context.story_blurb !== 'string' && typeof context.storyBlurb === 'string') {
    context.story_blurb = context.storyBlurb;
  }

  if (typeof context.storyStyle !== 'string' && typeof context.story_style === 'string') {
    context.storyStyle = context.story_style;
  }

  if (typeof context.story_style !== 'string' && typeof context.storyStyle === 'string') {
    context.story_style = context.storyStyle;
  }

  const normalizedPlayerCount = Number(context.playerCount ?? context.player_count ?? 4);
  context.playerCount = Number.isFinite(normalizedPlayerCount) ? normalizedPlayerCount : 4;
  context.player_count = context.playerCount;

  if (!context.solution && context.solutions && typeof context.solutions === 'object') {
    context.solution = context.solutions;
  }

  if (!context.solutions && context.solution && typeof context.solution === 'object') {
    context.solutions = context.solution;
  }

  if (!Array.isArray(context.cards)) {
    context.cards = [];
  }

  return context;
}

export function getStoryBlurb(context) {
  return context?.storyBlurb || context?.story_blurb || '';
}
