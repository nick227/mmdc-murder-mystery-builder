import crypto from 'node:crypto';

import { callJson } from '../llm/client.js';
import { buildPuzzlePrompt } from '../prompts/puzzlePrompt.js';
import { puzzleBundleSchema } from '../schemas/puzzleBundleSchema.js';
import { getCardsByType, getCharacterCards, pushCards } from '../utils/cards.js';
import { getStoryBlurb } from '../utils/context.js';
import { buildEvidenceSignature } from '../utils/evidenceFacts.js';
import {
  buildFactLedger,
  buildPressureEntriesFromText,
  extractAxes,
  findSameDirectionConflicts,
  hasDuplicateSignature
} from '../utils/factLedger.js';
import { derivePuzzleDifficulty } from '../utils/puzzleBundles.js';

function makeBundleId(index) {
  return `puzzle_bundle_${String(index + 1).padStart(3, '0')}`;
}

const VALID_ACTS = new Set([1, 2, 3]);
const DEFAULT_ACT = 2;
const PUZZLE_COUNT = 4;
const PUZZLE_TYPES = ['cross_reference', 'timeline', 'item_combination', 'elimination', 'cipher'];
const BUNDLE_ACTS = [1, 2, 3, 3];
const BUNDLE_DIFFICULTIES = ['medium', 'medium', 'hard', 'hard'];

function derivePuzzleTypeFromCategory(category) {
  switch (category) {
  case 'timing':
    return 'timeline';
  case 'location':
    return 'cross_reference';
  case 'access':
    return 'elimination';
  case 'ownership':
    return 'cross_reference';
  case 'movement':
    return 'timeline';
  case 'object':
    return 'item_combination';
  default:
    return 'cross_reference';
  }
}

function deriveEvidenceTargetCount(difficulty) {
  if (difficulty === 'easy') {
    return 2;
  }
  if (difficulty === 'hard') {
    return 4;
  }
  return 3;
}

function deriveEvidenceMinimumCount(_difficulty) {
  return 2;
}

function normalizeAxisLabel(axis) {
  const value = String(axis || '').trim().toLowerCase();
  if (!value) {
    return 'final chain';
  }
  return value.replace(/_/g, ' ');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeAct(value, fallback = DEFAULT_ACT) {
  return VALID_ACTS.has(value) ? value : fallback;
}

function defaultSolveInstructions(card, puzzleType = 'cross_reference') {
  const title = String(card?.card_title || '').trim();
  const label = title ? ` (${title})` : '';
  const t = PUZZLE_TYPES.includes(puzzleType) ? puzzleType : 'cross_reference';
  const stems = {
    timeline: `Use the visible evidence in this bundle to answer: When did the key event occur?${label}`,
    cross_reference: `Use the visible evidence in this bundle to answer: Which single fact is established?${label}`,
    elimination: `Use the visible evidence in this bundle to answer: Which possibility is ruled out or impossible?${label}`,
    item_combination: `Use the visible evidence in this bundle to answer: What concrete fact emerges from the combined evidence?${label}`,
    cipher: `Use the visible evidence in this bundle to answer: What does the decoded content state?${label}`
  };
  return stems[t] || stems.cross_reference;
}

function defaultPuzzleCardContents(puzzleType = 'cross_reference') {
  const t = PUZZLE_TYPES.includes(puzzleType) ? puzzleType : 'cross_reference';
  const stems = {
    timeline: 'When did the key event occur? Answer using only the visible evidence in this bundle.',
    cross_reference: 'Which single fact is established? Answer using only the visible evidence in this bundle.',
    elimination: 'Which possibility is ruled out or impossible? Answer using only the visible evidence in this bundle.',
    item_combination: 'What concrete fact emerges from the combined evidence?',
    cipher: 'What does the decoded content state? Answer using only the visible evidence in this bundle.'
  };
  return stems[t] || stems.cross_reference;
}

function sanitizePuzzleContents(card, solveInstructions) {
  const rawContents = String(card.card_contents || '').trim();
  const withoutSolutionSection = rawContents.replace(/\bsolution\s*:\s*[\s\S]*$/i, '').trim();
  const fallback = [
    withoutSolutionSection,
    solveInstructions ? `Instructions: ${solveInstructions}` : null
  ].filter(Boolean).join('\n\n').trim();

  const puzzleTitle = String(card?.card_title || '').trim();
  return fallback || `Use the visible evidence in this bundle to answer the puzzle question${puzzleTitle ? ` (${puzzleTitle})` : ''}.`;
}

function validateGeneratedBundleCards(cards = [], bundleIndex = 0, clueTarget = null) {
  const bundleCards = Array.isArray(cards) ? cards : [];
  const puzzleCards = bundleCards.filter((card) => card?.card_type === 'puzzle');
  const evidenceCards = bundleCards.filter((card) => card?.card_type === 'evidence');
  const solutionCards = bundleCards.filter((card) => card?.card_type === 'solution');
  const targetDifficulty = String(clueTarget?.difficulty_hint || '').trim() || BUNDLE_DIFFICULTIES[bundleIndex] || 'medium';
  const minimumEvidenceCount = deriveEvidenceMinimumCount(targetDifficulty);

  assert(
    puzzleCards.length === 1,
    `puzzle_bundle_${String(bundleIndex + 1).padStart(3, '0')} generated cards: must have exactly 1 puzzle card`
  );
  assert(
    evidenceCards.length >= minimumEvidenceCount,
    `puzzle_bundle_${String(bundleIndex + 1).padStart(3, '0')} generated cards: must have at least ${minimumEvidenceCount} evidence cards for difficulty ${targetDifficulty}`
  );

  if (solutionCards.length > 1) {
    throw new Error(
      `puzzle_bundle_${String(bundleIndex + 1).padStart(3, '0')} generated cards: must have exactly 1 solution card`
    );
  }
}

function normalizeGeneratedCards(cards = [], bundleIndex = 0, clueTarget = null) {
  const bundleCards = Array.isArray(cards) ? cards : [];
  validateGeneratedBundleCards(bundleCards, bundleIndex, clueTarget);
  const targetDifficulty = String(clueTarget?.difficulty_hint || '').trim() || BUNDLE_DIFFICULTIES[bundleIndex] || 'medium';
  const targetEvidenceCount = deriveEvidenceTargetCount(targetDifficulty);

  const evidenceCards = bundleCards
    .filter((card) => card?.card_type === 'evidence')
    .slice(0, targetEvidenceCount)
    .map((card, index) => ({
      card_ref: `bundle_${bundleIndex + 1}_evidence_${String(index + 1).padStart(3, '0')}`,
      card_type: 'clue',
      card_title: String(card?.card_title || `Evidence ${index + 1}`).trim(),
      card_contents: String(card?.card_contents || 'A concrete evidence card.').trim(),
      hidden_until_solved: false
    }));

  const puzzleInput = bundleCards.find((card) => card?.card_type === 'puzzle');

  const ensuredEvidenceCards = evidenceCards.length
    ? evidenceCards
    : [{
      card_ref: `bundle_${bundleIndex + 1}_evidence_001`,
      card_type: 'clue',
      card_title: `Evidence ${bundleIndex + 1}`,
      card_contents: 'A visible evidence card created to keep the puzzle solvable.',
      hidden_until_solved: false
    }];

  const solutionInput = bundleCards.find((card) => card?.card_type === 'solution');
  const targetFact = String(clueTarget?.fact || '').trim();
  const resolvedPuzzleType = String(clueTarget?.puzzle_type_hint || '').trim()
    || derivePuzzleTypeFromCategory(clueTarget?.category)
    || PUZZLE_TYPES[bundleIndex % PUZZLE_TYPES.length]
    || 'cross_reference';
  const puzzleCard = {
    card_ref: `bundle_${bundleIndex + 1}_puzzle`,
    card_type: 'puzzle',
    card_title: String(puzzleInput?.card_title || `Puzzle ${bundleIndex + 1}`).trim(),
    card_contents: String(puzzleInput?.card_contents || defaultPuzzleCardContents(resolvedPuzzleType)).trim(),
    hidden_until_solved: false
  };

  const solutionCard = {
    card_ref: `bundle_unlock_${String(bundleIndex + 1).padStart(3, '0')}`,
    card_type: 'solution',
    card_title: String(solutionInput?.card_title || `Clue ${bundleIndex + 1}`).trim(),
    card_contents: targetFact || String(solutionInput?.card_contents || 'A concrete clue revealed after the puzzle is solved.').trim(),
    hidden_until_solved: true
  };

  return [...ensuredEvidenceCards, solutionCard, puzzleCard];
}

function toEmittedCard(card, cardId, bundleId, defaultAct, bundlePuzzleType = 'cross_reference') {
  const act = normalizeAct(defaultAct, DEFAULT_ACT);
  const isPuzzle = card.card_type === 'puzzle';
  const cardRef = String(card.card_ref || '').trim();
  const cardTitle = String(card.card_title || '').trim();
  const solveInstructions = String(card.solve_instructions || '').trim();
  const safeSolveInstructions = solveInstructions || defaultSolveInstructions(card, bundlePuzzleType);

  return {
    card_id: cardId,
    card_ref: cardRef,
    card_type: card.card_type,
    card_title: cardTitle,
    card_contents: isPuzzle
      ? sanitizePuzzleContents(card, safeSolveInstructions)
      : String(card.card_contents || '').trim(),
    location_ref: typeof card.location_ref === 'string' ? card.location_ref : undefined,
    act,
    bundle_id: bundleId,
    hidden_until_solved: card.card_type === 'solution' ? true : (isPuzzle ? false : card.hidden_until_solved === true),
    solve_instructions: isPuzzle ? safeSolveInstructions : null
  };
}

function resolveRefs(refs, localRefToId, externalRefToId, bundleId, label) {
  return refs.map((ref) => {
    const resolved = localRefToId.get(ref) || externalRefToId.get(ref);
    assert(resolved, `Puzzle bundle ${bundleId} has unresolved ${label} ${ref}`);
    return resolved;
  });
}

export function flattenBundle(bundle, index, externalRefToId = new Map()) {
  const bundleId = makeBundleId(index);
  const targetAct = bundle?.clue_target?.act || BUNDLE_ACTS[index] || DEFAULT_ACT;
  const cards = normalizeGeneratedCards(bundle?.cards, index, bundle?.clue_target || null);
  const puzzleType = String(
    bundle?.clue_target?.puzzle_type_hint
    || derivePuzzleTypeFromCategory(bundle?.clue_target?.category)
    || PUZZLE_TYPES[index % PUZZLE_TYPES.length]
    || 'cross_reference'
  ).trim();
  const puzzleCards = cards.filter((card) => card.card_type === 'puzzle');
  const solutionCards = cards.filter((card) => card.card_type === 'solution');

  assert(puzzleCards.length === 1, `Puzzle bundle ${bundleId} must emit exactly 1 puzzle card`);
  assert(solutionCards.length === 1, `Puzzle bundle ${bundleId} must emit exactly 1 solution card`);

  const puzzleCardInput = puzzleCards[0];
  const puzzleCardRef = String(puzzleCardInput.card_ref || '').trim();
  const localEvidenceRefs = cards
    .filter((card) => card.card_type === 'clue' && card.hidden_until_solved !== true)
    .map((card) => String(card.card_ref || '').trim())
    .filter(Boolean);
  const priorUnlockRef = index > 0 ? `bundle_unlock_${String(index).padStart(3, '0')}` : null;
  const requiredCardRefs = [
    ...(priorUnlockRef ? [priorUnlockRef] : []),
    ...localEvidenceRefs
  ];
  const unlockCardRefs = [String(solutionCards[0].card_ref || '').trim()];

  assert(puzzleCardRef, `Puzzle bundle ${bundleId} puzzle missing card_ref`);
  assert(!requiredCardRefs.includes(puzzleCardRef), `Puzzle bundle ${bundleId} puzzle cannot require itself`);
  assert(!unlockCardRefs.includes(puzzleCardRef), `Puzzle bundle ${bundleId} puzzle cannot unlock itself`);

  const defaultAct = normalizeAct(targetAct, DEFAULT_ACT);
  const localRefToId = new Map();

  for (const card of cards) {
    const ref = String(card.card_ref || '').trim();
    const title = String(card.card_title || '').trim();
    assert(ref, `Puzzle bundle ${bundleId} has card without card_ref`);
    assert(title, `Puzzle bundle ${bundleId} has card without card_title`);
    assert(!localRefToId.has(ref), `Puzzle bundle ${bundleId} has duplicate card_ref ${ref}`);
    localRefToId.set(ref, crypto.randomUUID());
  }

  const emittedCards = cards.map((card) => {
    const cardRef = String(card.card_ref || '').trim();
    return toEmittedCard(card, localRefToId.get(cardRef), bundleId, defaultAct, puzzleType);
  });

  const puzzleCard = emittedCards.find((card) => card.card_type === 'puzzle');
  assert(puzzleCard, `Puzzle bundle ${bundleId} missing puzzle card`);
  assert(puzzleCard.solve_instructions, `Puzzle bundle ${bundleId} puzzle missing solve_instructions`);

  const requiredCardIds = resolveRefs(requiredCardRefs, localRefToId, externalRefToId, bundleId, 'required_card_ref');
  const unlockCardIds = resolveRefs(unlockCardRefs, localRefToId, externalRefToId, bundleId, 'unlock_card_ref');

  assert(!requiredCardIds.includes(puzzleCard.card_id), `Puzzle bundle ${bundleId} puzzle cannot require its own card_id`);
  assert(!unlockCardIds.includes(puzzleCard.card_id), `Puzzle bundle ${bundleId} puzzle cannot unlock its own card_id`);

  const evidenceCount = cards.filter((card) => card.card_type === 'clue').length;
  const difficulty = bundle?.clue_target?.difficulty_hint || BUNDLE_DIFFICULTIES[index] || derivePuzzleDifficulty(evidenceCount);
  const solutionSummary = String(solutionCards[0]?.card_contents || '').trim();

  puzzleCard.puzzle_type = puzzleType;
  puzzleCard.required_card_refs = requiredCardRefs;
  puzzleCard.unlock_card_refs = unlockCardRefs;
  puzzleCard.required_card_ids = requiredCardIds;
  puzzleCard.unlock_card_ids = unlockCardIds;
  puzzleCard.actionable_gain = 'Solve the puzzle to reveal the hidden clue in this bundle.';
  puzzleCard.solution_summary = solutionSummary || 'Reveal the hidden clue in this bundle.';
  puzzleCard.difficulty = difficulty;

  return {
    bundle_id: bundleId,
    act: defaultAct,
    puzzle_type: puzzleType,
    difficulty,
    actionable_gain: puzzleCard.actionable_gain,
    solution_summary: puzzleCard.solution_summary,
    clue_target: bundle?.clue_target || null,
    cards: emittedCards
  };
}

async function generateBundle(context, puzzleType, clueTarget, priorClueTargets, bundleIndex) {
  const isFinalBundle = bundleIndex === PUZZLE_COUNT - 1;
  if (isFinalBundle) {
    return buildDeterministicFinalBundle(context, puzzleType, clueTarget, priorClueTargets, bundleIndex);
  }
  const prompt = buildPuzzlePrompt({
    storyBlurb: getStoryBlurb(context),
    puzzleType,
    clueTarget,
    characters: getCharacterCards(context.cards).map((card) => card.card_title),
    locations: getCardsByType(context.cards, 'location').map((card) => card.card_title),
    priorClueTargets,
    bundleIndex,
    bundleCount: PUZZLE_COUNT,
    finalDependencyHint: isFinalBundle
      ? 'Use or reference at least one earlier discovered fact.'
      : ''
  });
  return callJson({
    ...prompt,
    schemaName: 'puzzle_bundle',
    schema: puzzleBundleSchema
  });
}

function buildDeterministicFinalBundle(context, puzzleType, clueTarget, priorClueTargets, bundleIndex) {
  const caseState = context?.case_state || {};
  const killerName = String(caseState?.killer_name || context?.coreTruth?.murder?.killer || 'the leading suspect').trim();
  const victimName = String(caseState?.victim_name || context?.coreTruth?.murder?.victim || 'the victim').trim();
  const murderLocation = String(caseState?.murder?.location || context?.coreTruth?.murder?.location || 'the garden').trim();
  const method = String(caseState?.murder?.method || context?.coreTruth?.murder?.method || 'the hidden method').trim();
  const treasureObject = String(context?.coreTruth?.treasure?.object || '').trim();
  const treasurePath = String(context?.coreTruth?.treasure?.discovery_path || context?.coreTruth?.treasure?.hiding_place || '').trim();
  const priorTarget = String(priorClueTargets[priorClueTargets.length - 1] || '').trim();
  const priorAxes = new Set(extractAxes(priorTarget));
  const targetAxes = extractAxes(String(clueTarget?.fact || '').trim());
  const finalAxis = targetAxes.find((axis) => !priorAxes.has(axis))
    || targetAxes[0]
    || 'possession';
  const axisLabel = normalizeAxisLabel(finalAxis);
  const objectLabel = treasureObject || method || 'the missing item';
  const pathLabel = treasurePath || murderLocation;
  const targetFact = String(clueTarget?.fact || '').trim()
    || `${killerName} becomes the only suspect consistent with the final chain.`;

  const evidenceByAxis = {
    possession: [
      {
        card_type: 'evidence',
        card_title: 'Recovered Inventory Note',
        card_contents: `The recovery inventory lists ${objectLabel} among effects traced to ${killerName} beside records from ${murderLocation}.`
      },
      {
        card_type: 'evidence',
        card_title: 'Custody Ledger',
        card_contents: `A custody entry shows ${killerName} controlling the route toward ${pathLabel} while ${victimName}'s belongings were being searched.`
      }
    ],
    physical_trace: [
      {
        card_type: 'evidence',
        card_title: 'Transfer Residue',
        card_contents: `Fresh residue linked to ${objectLabel} marked the path from ${pathLabel} to materials handled by ${killerName}.`
      },
      {
        card_type: 'evidence',
        card_title: 'Search Record',
        card_contents: `The search record notes the same residue on a recovered note tied to ${killerName} within the search around ${murderLocation}.`
      }
    ],
    contradiction: [
      {
        card_type: 'evidence',
        card_title: 'Account Comparison',
        card_contents: `${killerName}'s later account does not match the route already established around ${murderLocation}.`
      },
      {
        card_type: 'evidence',
        card_title: 'Recovered Instruction',
        card_contents: `A recovered instruction about ${objectLabel} remained with ${killerName}'s effects despite the earlier claim that it had already been passed on.`
      }
    ],
    timeline: [
      {
        card_type: 'evidence',
        card_title: 'Alarm Ledger',
        card_contents: `The alarm ledger places ${killerName} on the approach to ${pathLabel} after the earlier route clue and before the search settled.`
      },
      {
        card_type: 'evidence',
        card_title: 'Return Log',
        card_contents: `A return log connects ${killerName} to ${objectLabel} after ${victimName} vanished and before the household regrouped.`
      }
    ],
    witness: [
      {
        card_type: 'evidence',
        card_title: 'Late Witness Note',
        card_contents: `A late witness note recalls ${killerName} handling ${objectLabel} near ${pathLabel}.`
      },
      {
        card_type: 'evidence',
        card_title: 'Servants Register',
        card_contents: `The servants register confirms that the same route linked ${killerName} to ${murderLocation}.`
      }
    ],
    access: [
      {
        card_type: 'evidence',
        card_title: 'Master Route Entry',
        card_contents: `A master-route entry shows ${killerName} controlling passage toward ${pathLabel}.`
      },
      {
        card_type: 'evidence',
        card_title: 'Key Ledger',
        card_contents: `The key ledger links ${killerName} to the final approach into ${murderLocation} while ${objectLabel} remained unaccounted for.`
      }
    ],
    weapon: [
      {
        card_type: 'evidence',
        card_title: 'Method Inventory',
        card_contents: `An inventory note keeps ${method} tied to ${killerName}'s effects from ${murderLocation}.`
      },
      {
        card_type: 'evidence',
        card_title: 'Recovered Chain',
        card_contents: `The recovered chain from ${pathLabel} places ${objectLabel} and ${method} in the same final sequence around ${killerName}.`
      }
    ]
  };

  const evidenceCards = evidenceByAxis[finalAxis] || evidenceByAxis.possession;
  const priorRecap = priorClueTargets
    .slice(-3)
    .map((fact, index) => `Earlier clue ${index + 1}: ${String(fact || '').trim()}`)
    .filter(Boolean)
    .join('\n');

  return {
    cards: [
      ...evidenceCards,
      {
        card_type: 'solution',
        card_title: `Final ${axisLabel.replace(/\b\w/g, (char) => char.toUpperCase())} Conclusion`,
        card_contents: targetFact
      },
      {
        card_type: 'puzzle',
        card_title: `Final Puzzle ${bundleIndex + 1}`,
        card_contents: [
          `Use the visible evidence in this bundle to isolate the final ${axisLabel} constraint.`,
          priorRecap ? `Previous targets:\n${priorRecap}` : null,
          `Resolve how the records around ${killerName}, ${objectLabel}, and ${pathLabel} combine into one final conclusion.`
        ].filter(Boolean).join('\n\n')
      }
    ]
  };
}

function filterBundleCards(cards, context, ledger) {
  const nextLedger = {
    signatures: new Set(ledger.signatures),
    pressureEntries: [...ledger.pressureEntries]
  };
  const kept = [];

  for (const card of cards) {
    if (card?.card_type === 'puzzle' || card?.card_type === 'solution') {
      kept.push(card);
      continue;
    }

    const signature = buildEvidenceSignature({
      card_title: card?.card_title,
      card_contents: card?.card_contents
    }, context);
    if (hasDuplicateSignature(signature, nextLedger)) {
      continue;
    }
    if (findSameDirectionConflicts(signature, `${card?.card_title || ''} ${card?.card_contents || ''}`, nextLedger, context).length) {
      continue;
    }
    if (signature) {
      nextLedger.signatures.add(signature);
    }
    nextLedger.pressureEntries.push(
      ...buildPressureEntriesFromText(`${card?.card_title || ''} ${card?.card_contents || ''}`, context)
    );
    kept.push(card);
  }

  return kept;
}

function ensureMinimumEvidenceCards(originalCards, filteredCards) {
  const filteredEvidence = filteredCards.filter((card) => card?.card_type === 'evidence');
  if (filteredEvidence.length >= 2) {
    return filteredCards;
  }

  const originalEvidence = (Array.isArray(originalCards) ? originalCards : []).filter((card) => card?.card_type === 'evidence');
  const needed = 2 - filteredEvidence.length;
  const fill = originalEvidence
    .filter((card) => !filteredEvidence.includes(card))
    .slice(0, needed);

  return [...filteredCards, ...fill];
}

function buildAxisMap(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    const key = String(entry?.suspectId || '').trim();
    if (!key) {
      continue;
    }
    const axes = map.get(key) || new Set();
    axes.add(String(entry?.axis || '').trim());
    map.set(key, axes);
  }
  return map;
}

function validateUnlockedClueAgainstLedger(solutionCard, ledger, context, bundleId) {
  const text = `${solutionCard?.card_title || ''} ${solutionCard?.card_contents || ''}`.trim();
  const entries = buildPressureEntriesFromText(text, context);
  if (!entries.length) {
    return;
  }

  const existingAxisMap = buildAxisMap(ledger.pressureEntries);
  const newAxisMap = buildAxisMap(entries);
  const repeatedOnly = [];

  for (const [suspectId, axes] of newAxisMap.entries()) {
    const existingAxes = existingAxisMap.get(suspectId) || new Set();
    const introducesNewAxis = [...axes].some((axis) => !existingAxes.has(axis));
    if (!introducesNewAxis) {
      repeatedOnly.push(suspectId);
    }
  }

  if (repeatedOnly.length) {
    throw new Error(
      `puzzle_agent ${bundleId} unlocked clue repeats same suspect without a new deduction axis: ${repeatedOnly.join(', ')}`
    );
  }
}

export async function puzzleAgent(context) {
  const bundles = [];
  const knownRefToId = new Map();
  const clueTargets = Array.isArray(context.clue_targets) ? context.clue_targets : [];
  context.debug ??= {};
  context.debug.rejection_log ??= [];

  assert(
    clueTargets.length >= PUZZLE_COUNT,
    `puzzle_agent requires at least ${PUZZLE_COUNT} clue targets`
  );

  for (let puzzleIndex = 0; puzzleIndex < PUZZLE_COUNT; puzzleIndex += 1) {
    const clueTarget = clueTargets[puzzleIndex];
    const puzzleType = String(
      clueTarget?.puzzle_type_hint
      || derivePuzzleTypeFromCategory(clueTarget?.category)
      || PUZZLE_TYPES[puzzleIndex % PUZZLE_TYPES.length]
    ).trim();
    const priorClueTargets = clueTargets
      .slice(0, puzzleIndex)
      .map((target) => String(target?.fact || '').trim())
      .filter(Boolean);
    let bundle = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await generateBundle(context, puzzleType, clueTarget, priorClueTargets, puzzleIndex);
        const priorBundleContext = {
          ...context,
          cards: [...(context.cards || []), ...bundles.flatMap((candidate) => candidate.cards || [])]
        };
        const priorLedger = buildFactLedger(priorBundleContext);
        const filteredCards = ensureMinimumEvidenceCards(
          result.cards || [],
          filterBundleCards(result.cards || [], priorBundleContext, priorLedger)
        );
        bundle = flattenBundle({
          ...result,
          cards: filteredCards,
          clue_target: clueTarget
        }, puzzleIndex, knownRefToId);
        const solutionCard = bundle.cards.find((card) => card.card_type === 'solution');
        validateUnlockedClueAgainstLedger(solutionCard, priorLedger, priorBundleContext, bundle.bundle_id);
        break;
      } catch (error) {
        lastError = error;
        context.debug.rejection_log.push({
          stage: 'puzzle_agent',
          attempt,
          bundle_index: puzzleIndex,
          reason: String(error?.message || error)
        });
      }
    }
    if (!bundle) {
      throw lastError || new Error(`puzzle_agent failed for bundle ${puzzleIndex + 1}`);
    }
    bundle.clue_target = clueTarget;
    bundles.push(bundle);
    for (const card of bundle.cards) {
      if (card.card_ref) {
        knownRefToId.set(card.card_ref, card.card_id);
      }
    }
  }

  const emittedCards = bundles.flatMap((bundle) => bundle.cards);

  context.debug.bundle_stats.push(
    ...bundles.map((bundle) => {
      const puzzleCard = bundle.cards.find((card) => card.card_type === 'puzzle');
      return {
        bundle_id: bundle.bundle_id,
        card_count: bundle.cards.length,
        required_count: Array.isArray(puzzleCard?.required_card_ids) ? puzzleCard.required_card_ids.length : 0,
        unlock_count: Array.isArray(puzzleCard?.unlock_card_ids) ? puzzleCard.unlock_card_ids.length : 0,
        difficulty: bundle.difficulty,
        clue_target: bundle.clue_target?.fact || null
      };
    })
  );

  context.puzzle_bundles = bundles.map((bundle) => ({
    bundle_id: bundle.bundle_id,
    act: bundle.act,
    puzzle_type: bundle.puzzle_type,
    difficulty: bundle.difficulty,
    actionable_gain: bundle.actionable_gain,
    solution_summary: bundle.solution_summary,
    clue_target: bundle.clue_target?.fact || null,
    card_ids: bundle.cards.map((card) => card.card_id)
  }));

  return pushCards(context, 'puzzle', emittedCards);
}
