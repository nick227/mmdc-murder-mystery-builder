import { deriveSolution, deriveTruths } from './solution.js';

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
  delete context.story_blurb;

  if (typeof context.storyStyle !== 'string' && typeof context.story_style === 'string') {
    context.storyStyle = context.story_style;
  }
  delete context.story_style;

  const normalizedPlayerCount = Number(context.playerCount ?? context.player_count ?? 4);
  context.playerCount = Number.isFinite(normalizedPlayerCount) ? normalizedPlayerCount : 4;
  delete context.player_count;

  delete context.solutions;
  delete context.murder_truth;
  delete context.fortune_truth;
  delete context.solution;

  if (!Array.isArray(context.cards)) {
    context.cards = [];
  }

  if (context.caseState && !context.case_state) {
    context.case_state = context.caseState;
  }
  delete context.caseState;

  return context;
}

export function getStoryBlurb(context) {
  return context?.storyBlurb || context?.story_blurb || '';
}

/** Host-facing packaging for LLM prompts (after story_metadata_agent). */
export function getStoryMetaForPrompts(context) {
  const lines = [];
  const title = String(context?.story_title || '').trim();
  const themes = String(context?.story_themes || '').trim();
  const desc = String(context?.story_description || '').trim();
  const rating = String(context?.story_rating || '').trim();
  if (title) {
    lines.push(`Title: ${title}`);
  }
  if (themes) {
    lines.push(`Theme tags: ${themes}`);
  }
  if (rating) {
    lines.push(`Content rating: ${rating}`);
  }
  if (desc) {
    lines.push(`Host pitch: ${desc}`);
  }
  return lines.join('\n\n');
}

export function getMurderTruth(context) {
  return deriveTruths(context).murder_truth || null;
}

export function getTreasureTruth(context) {
  return deriveTruths(context).fortune_truth || null;
}

export function getSolution(context) {
  return deriveSolution(context) || null;
}
