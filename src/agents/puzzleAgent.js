import crypto from 'node:crypto';

import { callJson } from '../llm/client.js';
import { buildPuzzlePrompt } from '../prompts/puzzlePrompt.js';
import { puzzleBundlesSchema } from '../schemas/puzzleBundleSchema.js';
import { getCardsByType, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';

const difficultyToEvidenceStrength = {
  easy: 'supporting',
  medium: 'supporting',
  hard: 'strong'
};

const fallbackTitlesByType = {
  puzzle: [
    'Access Reconstruction',
    'Timeline Cross-Check',
    'Object Chain Comparison',
    'Decoded Contradiction'
  ],
  item: [
    'Logbook Entry',
    'Encrypted Note',
    'Physical Trace',
    'Witness Statement'
  ],
  clue: [
    'Access Restriction',
    'Timeline Contradiction',
    'Object Link',
    'Alibi Break'
  ]
};

export function hasMeaningfulActionableGain(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'mock') {
    return false;
  }

  const genericPhrases = [
    'narrows the suspect space',
    'through access, timeline',
    'through access timeline',
    'object evidence'
  ];
  if (genericPhrases.some((term) => text.includes(term))) {
    return false;
  }

  // Keep this aligned with cardQualityAgent's expectations: actionable_gain must
  // describe an actual state change to the suspect space, not a vague insight.
  const weakTerms = [
    'provides insight',
    'reveals more',
    'suggests',
    'may indicate',
    'helps determine'
  ];
  if (weakTerms.some((term) => text.includes(term))) {
    return false;
  }

  const strongVerbs = [
    'eliminate',
    'eliminates',
    'rule out',
    'narrow',
    'narrows',
    'contradict',
    'contradicts',
    'link',
    'links',
    'break',
    'breaks',
    'prove',
    'proves'
  ];

  const hasStrongVerb = strongVerbs.some((term) => text.includes(term));
  if (!hasStrongVerb) {
    return false;
  }

  const signalTerms = [
    'suspect',
    'timeline',
    'access',
    'object',
    'weapon',
    'route',
    'alibi',
    'movement',
    'owner',
    'motive',
    'location'
  ];

  return signalTerms.some((term) => text.includes(term));
}

function hasMeaningfulSolutionSummary(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'mock') {
    return false;
  }

  return ['and', 'both', 'compare', 'combined', 'together', 'cross reference', 'contradiction', 'intersection']
    .some((term) => text.includes(term));
}

function pickAct(bundle, cards) {
  const puzzleCard = cards.find((card) => card.card_type === 'puzzle');
  const act = puzzleCard?.act ?? bundle?.cards?.[0]?.act;
  return act === 1 || act === 2 || act === 3 ? act : 2;
}

function normalizeCardRef(value, fallback) {
  const normalized = String(value || fallback).trim();
  return normalized || fallback;
}

function makeBundleId(index) {
  return `puzzle_bundle_${String(index + 1).padStart(3, '0')}`;
}

export function isPlaceholderTitle(value) {
  const text = String(value || '').trim();
  return /Puzzle Bundle.*Card/i.test(text)
    || /^Card \d+$/i.test(text)
    || /^Bundle \d+/i.test(text);
}

function defaultCardContents(cardType) {
  if (cardType === 'puzzle') {
    return 'A concrete deduction question that requires comparing at least two referenced cards.';
  }
  if (cardType === 'item') {
    return 'A physical item with markings, ownership hints, and a time-related detail players can compare against a record.';
  }
  return 'An objective record excerpt (log, ledger, schedule, note) that can contradict or narrow a suspect timeline or access.';
}

function defaultCardTitle(cardType, bundleIndex, cardIndex) {
  const options = fallbackTitlesByType[cardType] || fallbackTitlesByType.item;
  return options[(bundleIndex + cardIndex) % options.length];
}

function validateNormalizedBundle(bundle, index) {
  for (const card of bundle.cards || []) {
    if (isPlaceholderTitle(card.card_title)) {
      throw new Error(`Puzzle bundle ${makeBundleId(index)} contains placeholder title after normalization`);
    }
  }
}

function defaultActionableGain(puzzleType) {
  switch (puzzleType) {
    case 'cross_reference':
      return 'Proves one suspect could access the scene while another could not.';
    case 'cipher':
      return 'Reveals a hidden timing or location clue.';
    case 'item_combination':
      return 'Links one object to one suspect or route.';
    case 'elimination':
      return 'Rules out one suspect from a key action.';
    case 'timeline':
      return 'Breaks one alibi or narrows the event window.';
    default:
      return 'Narrows one suspect, route, or timeline possibility.';
  }
}

function buildUpstreamLookup(cards) {
  const lookup = new Map();

  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.card_id) {
      lookup.set(card.card_id, card.card_id);
    }
  }

  return lookup;
}

function ensureBundleShape(bundle, index) {
  const cards = Array.isArray(bundle?.cards) ? bundle.cards : [];
  const usedRefs = new Set();
  const ensuredCards = cards.slice(0, 5).map((card, cardIndex) => {
    const baseRef = normalizeCardRef(card?.card_ref, `bundle_${index + 1}_card_${cardIndex + 1}`);
    let cardRef = baseRef;
    let suffix = 2;

    while (usedRefs.has(cardRef)) {
      cardRef = `${baseRef}_${suffix}`;
      suffix += 1;
    }
    usedRefs.add(cardRef);

    const inferredType = card?.card_type;
    const fallbackType = cardIndex === 0 ? 'puzzle' : (cardIndex % 2 === 1 ? 'item' : 'clue');
    const cardType = inferredType || fallbackType;
    const rawTitle = String(card?.card_title || '').trim();

    return {
      card_ref: cardRef,
      card_type: cardType,
      card_title: !rawTitle || isPlaceholderTitle(rawTitle)
        ? defaultCardTitle(cardType, index, cardIndex)
        : rawTitle,
      card_contents: String(card?.card_contents || '').trim() || defaultCardContents(cardType),
      act: card?.act,
      hidden_until_solved: card?.hidden_until_solved === true
    };
  });

  while (ensuredCards.length < 4) {
    const fallbackType = ensuredCards.length === 0 ? 'puzzle' : (ensuredCards.length % 2 === 1 ? 'item' : 'clue');
    ensuredCards.push({
      card_ref: `bundle_${index + 1}_card_${ensuredCards.length + 1}`,
      card_type: fallbackType,
      card_title: defaultCardTitle(fallbackType, index, ensuredCards.length),
      card_contents: defaultCardContents(fallbackType),
      act: 2,
      hidden_until_solved: false
    });
  }

  if (!ensuredCards.some((card) => card.card_type === 'puzzle')) {
    ensuredCards[0].card_type = 'puzzle';
  }

  let puzzleSeen = false;
  for (let i = 0; i < ensuredCards.length; i += 1) {
    const card = ensuredCards[i];
    const act = card.act;

    card.act = act === 1 || act === 2 || act === 3 ? act : 2;

    if (card.card_type === 'puzzle' && !puzzleSeen) {
      puzzleSeen = true;
      card.hidden_until_solved = false;
      continue;
    }

    if (card.card_type === 'puzzle') {
      card.card_type = i % 2 === 0 ? 'item' : 'clue';
    }
  }

  const nonPuzzleCards = ensuredCards.filter((card) => card.card_type !== 'puzzle');
  for (let i = 0; i < Math.min(2, nonPuzzleCards.length); i += 1) {
    nonPuzzleCards[i].hidden_until_solved = false;
  }
  if (nonPuzzleCards.length && !nonPuzzleCards.some((card) => card.hidden_until_solved === true)) {
    nonPuzzleCards[nonPuzzleCards.length - 1].hidden_until_solved = true;
  }

  return {
    puzzle_type: bundle?.puzzle_type,
    difficulty: bundle?.difficulty,
    actionable_gain: hasMeaningfulActionableGain(bundle?.actionable_gain)
      ? String(bundle.actionable_gain).trim()
      : defaultActionableGain(bundle?.puzzle_type),
    solution_summary: hasMeaningfulSolutionSummary(bundle?.solution_summary)
      ? String(bundle.solution_summary).trim()
      : `Compare both visible records together to find the contradiction that narrows the suspect space in puzzle bundle ${index + 1}.`,
    required_card_refs: Array.isArray(bundle?.required_card_refs) ? bundle.required_card_refs.map((value) => String(value || '').trim()).filter(Boolean) : [],
    unlock_card_refs: Array.isArray(bundle?.unlock_card_refs) ? bundle.unlock_card_refs.map((value) => String(value || '').trim()).filter(Boolean) : [],
    cards: ensuredCards
  };
}

function resolveReferenceIds(refs, refToId, upstreamLookup) {
  const ids = [];
  const seen = new Set();

  for (const ref of refs) {
    const id = refToId.get(ref) || upstreamLookup.get(ref);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function normalizeSemanticText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safePuzzleDifficulty(requested, actionableGain, solutionSummary) {
  const difficulty = requested === 'easy' || requested === 'medium' || requested === 'hard'
    ? requested
    : 'medium';

  if (difficulty !== 'hard') {
    return difficulty;
  }

  const combined = `${normalizeSemanticText(actionableGain)} ${normalizeSemanticText(solutionSummary)}`.trim();
  const changesSuspectSpace = ['eliminate', 'eliminates', 'narrow', 'narrows', 'contradict', 'contradicts', 'link', 'links', 'break', 'breaks', 'prove', 'proves']
    .some((term) => combined.includes(term));
  const solvesCase = ['killer', 'murderer', 'case solved', 'full solution'].some((term) => combined.includes(term));

  // Downgrade mis-tagged hard puzzles so quality gates don't fail.
  if (!changesSuspectSpace || solvesCase) {
    return 'medium';
  }

  return 'hard';
}

export function flattenBundle(bundle, index, upstreamLookup) {
  const normalized = ensureBundleShape(bundle, index);
  validateNormalizedBundle(normalized, index);
  const bundleId = makeBundleId(index);
  const act = pickAct(normalized, normalized.cards);
  const refToId = new Map();

  for (const card of normalized.cards) {
    refToId.set(card.card_ref, crypto.randomUUID());
  }

  const localCardIds = new Set([...refToId.values()]);

  const visibleLocalIds = normalized.cards
    .filter((card) => card.card_type !== 'puzzle' && card.hidden_until_solved !== true)
    .map((card) => refToId.get(card.card_ref));

  const hiddenLocalRefs = normalized.cards
    .filter((card) => card.card_type !== 'puzzle' && card.hidden_until_solved === true)
    .map((card) => card.card_ref);
  const puzzleCard = normalized.cards.find((card) => card.card_type === 'puzzle');

  let requiredCardIds = resolveReferenceIds(normalized.required_card_refs, refToId, upstreamLookup);
  for (const id of visibleLocalIds) {
    if (requiredCardIds.length >= 2) {
      break;
    }
    if (!requiredCardIds.includes(id)) {
      requiredCardIds.push(id);
    }
  }

  const unlockCardIds = resolveReferenceIds(normalized.unlock_card_refs, refToId, upstreamLookup);
  for (const ref of hiddenLocalRefs) {
    const id = refToId.get(ref);
    if (id && !unlockCardIds.includes(id)) {
      unlockCardIds.push(id);
    }
  }

  // Required cards must be available to solve the puzzle; unlock cards are hidden until solved.
  // If the model mistakenly lists a hidden card in required_card_refs, drop it.
  requiredCardIds = requiredCardIds.filter((id) => !unlockCardIds.includes(id));

  const upstreamDependencyIds = requiredCardIds.filter((id) => !localCardIds.has(id));
  const baseDifficulty = safePuzzleDifficulty(
    normalized.difficulty || 'medium',
    normalized.actionable_gain,
    normalized.solution_summary
  );
  // Strong puzzles must not be self-contained; if there's no upstream dependency,
  // downgrade to medium so quality gates don't reject it.
  const effectiveDifficulty = upstreamDependencyIds.length && baseDifficulty === 'hard'
    ? 'hard'
    : (baseDifficulty === 'hard' ? 'medium' : baseDifficulty);
  const evidenceStrength = difficultyToEvidenceStrength[effectiveDifficulty] || 'supporting';
  const puzzleCardId = puzzleCard ? refToId.get(puzzleCard.card_ref) : null;

  if (puzzleCardId) {
    const selfIndex = requiredCardIds.indexOf(puzzleCardId);
    if (selfIndex >= 0) {
      requiredCardIds.splice(selfIndex, 1);
    }
  }
  for (const id of visibleLocalIds) {
    if (requiredCardIds.length >= 2) {
      break;
    }
    if (id !== puzzleCardId && !requiredCardIds.includes(id)) {
      requiredCardIds.push(id);
    }
  }

  const flattenedCards = normalized.cards.map((card) => {
    const cardId = refToId.get(card.card_ref);
    const isPuzzle = card.card_type === 'puzzle';
    const isUnlockCard = unlockCardIds.includes(cardId);
    const baseCard = {
      card_id: cardId,
      card_type: card.card_type,
      card_title: card.card_title,
      card_contents: card.card_contents,
      act: card.act === 1 || card.act === 2 || card.act === 3 ? card.act : act,
      bundle_id: bundleId,
      hidden_until_solved: isPuzzle ? false : isUnlockCard
    };

    if (isPuzzle) {
      return {
        ...baseCard,
        puzzle_type: normalized.puzzle_type || 'cross_reference',
        difficulty: effectiveDifficulty,
        required_card_ids: requiredCardIds,
        unlock_card_ids: unlockCardIds,
        actionable_gain: normalized.actionable_gain,
        solution_summary: normalized.solution_summary
      };
    }

    if (card.card_type === 'clue' && isUnlockCard) {
      baseCard.evidence_strength = evidenceStrength;
    }

    return baseCard;
  });

  return {
    bundle_id: bundleId,
    puzzle_type: normalized.puzzle_type || 'cross_reference',
    difficulty: effectiveDifficulty,
    actionable_gain: normalized.actionable_gain,
    solution_summary: normalized.solution_summary,
    evidence_strength: evidenceStrength,
    upstream_dependency_ids: upstreamDependencyIds,
    cards: flattenedCards
  };
}

function validateFlattenedBundle(bundle, solution) {
  const cards = Array.isArray(bundle?.cards) ? bundle.cards : [];
  const puzzleCards = cards.filter((card) => card.card_type === 'puzzle');
  const nonPuzzleCards = cards.filter((card) => card.card_type !== 'puzzle');
  const hiddenCards = nonPuzzleCards.filter((card) => card.hidden_until_solved === true);
  const cardIds = new Set(cards.map((card) => card.card_id));
  const puzzleCard = puzzleCards[0];
  let requiredCardIds = Array.isArray(puzzleCard?.required_card_ids) ? puzzleCard.required_card_ids : [];
  const unlockCardIds = Array.isArray(puzzleCard?.unlock_card_ids) ? puzzleCard.unlock_card_ids : [];
  const hiddenCardIds = new Set(hiddenCards.map((card) => card.card_id));
  const visibleUnlockIds = unlockCardIds.filter((id) => !hiddenCardIds.has(id));
  const requiredHiddenIds = requiredCardIds.filter((id) => hiddenCardIds.has(id));
  const unlockOutsideBundleIds = unlockCardIds.filter((id) => !cardIds.has(id));
  const referencesOwnPuzzleCard = requiredCardIds.includes(puzzleCard?.card_id);
  const allRequiredAreLocal = requiredCardIds.length > 0 && requiredCardIds.every((id) => cardIds.has(id));
  const hasUpstreamDependency = (bundle.upstream_dependency_ids || []).length > 0;
  const combinedText = cards.map((card) => `${card.card_title} ${card.card_contents}`).join(' ').toLowerCase();
  const solutionTokens = [
    solution?.killer,
    solution?.method,
    solution?.location,
    solution?.motive
  ].filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim().toLowerCase());
  const uniqueSolutionTokens = [...new Set(solutionTokens)];
  const revealsSolutionAlone =
    uniqueSolutionTokens.length >= 3 &&
    uniqueSolutionTokens.every((token) => combinedText.includes(token));

  if (puzzleCards.length !== 1) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} must emit exactly 1 puzzle card`);
  }
  if (cards.some((card) => isPlaceholderTitle(card.card_title))) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} contains placeholder titles after flattening`);
  }
  if (nonPuzzleCards.length < 2) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} must emit at least 2 new non-puzzle cards`);
  }
  if (!bundle.actionable_gain?.trim()) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} missing actionable gain`);
  }
  if (!requiredCardIds.length) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} puzzle must require at least one card`);
  }
  if (!unlockCardIds.length) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} puzzle must unlock at least one card`);
  }
  if (referencesOwnPuzzleCard) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} puzzle cannot require itself`);
  }
  if (unlockOutsideBundleIds.length) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} unlock cards must belong to the bundle`);
  }
  if (requiredCardIds.some((id) => !cardIds.has(id) && !(bundle.upstream_dependency_ids || []).includes(id))) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} has missing required cards`);
  }
  if (visibleUnlockIds.length) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} unlock cards must be hidden until solved`);
  }
  if (requiredHiddenIds.length) {
    // Auto-repair: required cards must be visible pre-solve. If the model
    // accidentally required an unlock card, drop it rather than failing.
    requiredCardIds = requiredCardIds.filter((id) => !hiddenCardIds.has(id));
    if (puzzleCard && Array.isArray(puzzleCard.required_card_ids)) {
      puzzleCard.required_card_ids = requiredCardIds;
    }
    if (!requiredCardIds.length) {
      throw new Error(`Puzzle bundle ${bundle.bundle_id} puzzle must require at least one visible card`);
    }
  }
  if (allRequiredAreLocal && !hasUpstreamDependency && bundle.evidence_strength === 'strong') {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} cannot be a self-contained strong puzzle`);
  }
  if (revealsSolutionAlone) {
    throw new Error(`Puzzle bundle ${bundle.bundle_id} reveals the full solution alone`);
  }
}

function tokenizeForSimilarity(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function jaccard(a, b) {
  const aSet = new Set(tokenizeForSimilarity(a));
  const bSet = new Set(tokenizeForSimilarity(b));
  if (!aSet.size || !bSet.size) {
    return 0;
  }
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
}

function hasRedundantUnlockCards(bundles, allCards) {
  const cardLookup = new Map((Array.isArray(allCards) ? allCards : []).map((card) => [card.card_id, card]));

  for (const bundle of Array.isArray(bundles) ? bundles : []) {
    const bundleCards = Array.isArray(bundle?.cards) ? bundle.cards : [];
    const puzzle = bundleCards.find((card) => card.card_type === 'puzzle');
    if (!puzzle) {
      continue;
    }

    const unlockIds = new Set(puzzle.unlock_card_ids || []);
    const unlock = (puzzle.unlock_card_ids || []).map((id) => cardLookup.get(id)).filter(Boolean);
    const comparisons = (Array.isArray(allCards) ? allCards : []).filter((card) => card?.card_id && !unlockIds.has(card.card_id));

    for (const unlockCard of unlock) {
      const unlockText = `${unlockCard.card_title} ${unlockCard.card_contents}`;
      for (const other of comparisons) {
        const otherText = `${other.card_title} ${other.card_contents}`;
        if (jaccard(unlockText, otherText) > 0.85) {
          return true;
        }
      }
    }
  }

  return false;
}

export async function puzzleAgent(context) {
  const upstreamCards = [
    ...getCardsByType(context.cards, 'item'),
    ...getCardsByType(context.cards, 'clue')
  ];

  const puzzleCount = 4;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const prompt = buildPuzzlePrompt({
      storyBlurb: getStoryBlurb(context),
      trails: context.trails,
      narratives: context.narratives,
      upstreamCards,
      puzzleCount
    });

    const result = await callJson({
      ...prompt,
      schemaName: 'puzzle_bundles',
      schema: puzzleBundlesSchema(puzzleCount, puzzleCount)
    });

    const upstreamLookup = buildUpstreamLookup(upstreamCards);
    const bundles = (result.bundles || []).map((bundle, index) => flattenBundle(bundle, index, upstreamLookup));

    for (const bundle of bundles) {
      try {
        validateFlattenedBundle(bundle, context.solution);
      } catch (error) {
        context.debug.rejection_log.push({
          bundle_id: bundle.bundle_id,
          reason: error.message.replace(`Puzzle bundle ${bundle.bundle_id} `, '').trim(),
          stage: 'structural'
        });
        throw error;
      }
    }

    const emittedCards = bundles.flatMap((bundle) => bundle.cards);
    const combined = [...upstreamCards, ...emittedCards];

    if (hasRedundantUnlockCards(bundles, combined)) {
      context.debug.warning_log.push({
        bundle_id: null,
        reason: 'redundant_unlock_generation',
        stage: 'structural'
      });
    }

    context.debug.bundle_stats.push(...bundles.map((bundle) => {
      const puzzleCard = bundle.cards.find((card) => card.card_type === 'puzzle');
      return {
        bundle_id: bundle.bundle_id,
        card_count: bundle.cards.length,
        required_count: Array.isArray(puzzleCard?.required_card_ids) ? puzzleCard.required_card_ids.length : 0,
        unlock_count: Array.isArray(puzzleCard?.unlock_card_ids) ? puzzleCard.unlock_card_ids.length : 0,
        difficulty: bundle.difficulty,
        strength: bundle.evidence_strength
      };
    }));

    context.puzzle_bundles = bundles.map((bundle) => ({
      bundle_id: bundle.bundle_id,
      puzzle_type: bundle.puzzle_type,
      difficulty: bundle.difficulty,
      actionable_gain: bundle.actionable_gain,
      solution_summary: bundle.solution_summary,
      card_ids: bundle.cards.map((card) => card.card_id)
    }));

    return pushCards(context, 'puzzle', emittedCards);
  }

  return context;
}
