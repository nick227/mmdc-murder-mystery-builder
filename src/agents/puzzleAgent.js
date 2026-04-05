import { callJson } from '../llm/client.js';
import { buildPuzzlePrompt } from '../prompts/puzzlePrompt.js';
import { puzzleBundleSchema } from '../schemas/puzzleBundleSchema.js';
import { getCardsByType, getCharacterCards } from '../utils/cards.js';
import { getCanonicalMurderStrings, getMurderCanonRef } from '../utils/canonFacts.js';
import { getStoryBlurb } from '../utils/context.js';
import { DEFAULT_PUZZLE_COUNT, coercePuzzleCount } from '../config/generationDefaults.js';

const PUZZLE_TYPES = ['cross_reference', 'timeline', 'item_combination', 'elimination', 'cipher'];

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function usedClueTitlesCsvFromContext(context) {
  const cards = Array.isArray(context?.cards) ? context.cards : [];
  return cards
    .filter((c) => c?.card_type === 'clue')
    .map((c) => String(c?.card_title || '').trim())
    .filter(Boolean)
    .join(', ');
}

function attachMurderCanonToDraftCards(cards, coreTruth) {
  const ref = getMurderCanonRef(coreTruth);
  return (Array.isArray(cards) ? cards : []).map((c) => {
    const t = String(c?.card_type || '').trim();
    if (t === 'evidence' || t === 'puzzle') {
      return { ...c, murder_canon: { ...ref } };
    }
    return c;
  });
}

export async function puzzleAgent(context) {
  const puzzleCount = coercePuzzleCount(context?.puzzleCount, DEFAULT_PUZZLE_COUNT);
  if (puzzleCount === 0) {
    context.puzzle_bundle_drafts = [];
    return context;
  }
  const clueTargets = Array.isArray(context?.clue_targets) ? context.clue_targets : [];
  const targets = clueTargets.slice(0, puzzleCount);

  const drafts = [];
  const cards = context.cards || [];
  const { victim: canonicalVictim, location: canonicalLocation } = getCanonicalMurderStrings(context.coreTruth);

  let usedTitlesCsv = usedClueTitlesCsvFromContext(context);
  const usedTitleKeys = new Set(
    usedTitlesCsv
      .split(',')
      .map((t) => normalizeTitle(t))
      .filter(Boolean)
  );

  for (let i = 0; i < puzzleCount; i++) {
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
      bundleCount: puzzleCount,
      canonicalKiller: context?.coreTruth?.murder?.killer || '',
      canonicalVictim,
      canonicalLocation,
      usedClueTitlesCsv: usedTitlesCsv
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'puzzle_bundle',
      schema: puzzleBundleSchema
    });

    const draftCards = attachMurderCanonToDraftCards(result?.cards || [], context.coreTruth);

    for (const c of draftCards) {
      if (String(c?.card_type || '').trim() !== 'evidence') {
        continue;
      }
      const title = String(c?.card_title || '').trim();
      const key = normalizeTitle(title);
      if (key && !usedTitleKeys.has(key)) {
        usedTitleKeys.add(key);
        usedTitlesCsv = `${usedTitlesCsv}${usedTitlesCsv ? ', ' : ''}${title}`;
      }
    }

    drafts.push({
      clue_target: clueTarget,
      puzzle_type: puzzleType,
      cards: draftCards
    });
  }

  context.puzzle_bundle_drafts = drafts;
  return context;
}
