import { callJson } from '../llm/client.js';
import { buildPuzzlePrompt } from '../prompts/puzzlePrompt.js';
import { puzzleBundleSchema } from '../schemas/puzzleBundleSchema.js';
import { getCardsByType, getCharacterCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const PUZZLE_COUNT = 4;
const PUZZLE_TYPES = ['cross_reference', 'timeline', 'item_combination', 'elimination', 'cipher'];

export async function puzzleAgent(context) {
  const clueTargets = Array.isArray(context?.clue_targets) ? context.clue_targets : [];
  const targets = clueTargets.slice(0, PUZZLE_COUNT);

  const drafts = [];
  const cards = context.cards || [];

  for (let i = 0; i < PUZZLE_COUNT; i++) {
    const clueTarget = targets[i] || {};

    const puzzleType =
      clueTarget?.puzzle_type_hint ||
      PUZZLE_TYPES[Math.floor(Math.random() * PUZZLE_TYPES.length)];

    const priorClueTargets = targets
      .slice(0, i)
      .map(t => t?.fact)
      .filter(Boolean);

    const prompt = buildPuzzlePrompt({
      storyBlurb: getStoryBlurb(context),
      puzzleType,
      clueTarget,
      characters: getCharacterCards(cards).map(c => c.card_title),
      locations: getCardsByType(cards, 'location').map(c => c.card_title),
      priorClueTargets,
      bundleIndex: i,
      bundleCount: PUZZLE_COUNT,
      canonicalKiller: context?.coreTruth?.murder?.killer || ''
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'puzzle_bundle',
      schema: puzzleBundleSchema
    });

    drafts.push({
      clue_target: clueTarget,
      puzzle_type: puzzleType,
      cards: result?.cards || []
    });
  }

  context.puzzle_bundle_drafts = drafts;
  return context;
}
