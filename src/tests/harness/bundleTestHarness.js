import { cardQualityAgent } from '../../agents/cardQualityAgent.js';
import { bundleStructureValidatorAgent } from '../../agents/bundleStructureValidatorAgent.js';

function resolveArgs(caseStateOrOptions = {}, maybeOptions = {}) {
  const looksLikeOptionsOnly = (
    caseStateOrOptions
    && typeof caseStateOrOptions === 'object'
    && !Array.isArray(caseStateOrOptions)
    && Object.keys(caseStateOrOptions).every((key) => ['debug'].includes(key))
  );

  if (looksLikeOptionsOnly) {
    return {
      caseState: {},
      options: caseStateOrOptions
    };
  }

  return {
    caseState: caseStateOrOptions || {},
    options: maybeOptions || {}
  };
}

function printDebug(label, payload) {
  console.log(`[bundleTestHarness] ${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

function enrichFixtureBundles(cards, seedBundles) {
  const bundleMap = new Map();
  for (const card of cards) {
    if (!card?.bundle_id) {
      continue;
    }
    if (!bundleMap.has(card.bundle_id)) {
      bundleMap.set(card.bundle_id, []);
    }
    bundleMap.get(card.bundle_id).push(card);
  }

  const metaById = new Map(
    (Array.isArray(seedBundles) ? seedBundles : []).map((entry) => [entry.bundle_id, { ...entry }])
  );

  for (const [bundleId, bundleCards] of bundleMap) {
    const puzzle = bundleCards.find((c) => c.card_type === 'puzzle');
    const solution = bundleCards.find((c) => c.card_type === 'solution');
    if (puzzle) {
      puzzle.puzzle_type ??= 'cross_reference';
      puzzle.act ??= 1;
      if (solution?.card_id && (!Array.isArray(puzzle.unlock_card_ids) || puzzle.unlock_card_ids.length === 0)) {
        puzzle.unlock_card_ids = [solution.card_id];
      }
    }

    const merged = { bundle_id: bundleId, ...(metaById.get(bundleId) || {}) };
    if (puzzle?.puzzle_type) {
      merged.puzzle_type = puzzle.puzzle_type;
    }
    if (puzzle?.act != null) {
      merged.act = puzzle.act;
    }
    if (solution?.card_contents) {
      merged.clue_target = solution.card_contents;
    }
    metaById.set(bundleId, merged);
  }

  return [...metaById.values()].sort((a, b) =>
    String(a.bundle_id || '').localeCompare(String(b.bundle_id || ''))
  );
}

export async function testBundle(cards, caseStateOrOptions = {}, maybeOptions = {}) {
  const { caseState, options } = resolveArgs(caseStateOrOptions, maybeOptions);
  const debug = options?.debug === true;
  const safeCards = Array.isArray(cards) ? cards.map((card) => ({ ...card })) : [];
  const bundleId = safeCards[0]?.bundle_id || 'bundle_test_001';

  safeCards.forEach((card, index) => {
    if (card.card_type === 'evidence') {
      card.card_type = 'clue';
    }
    card.bundle_id = card.bundle_id || bundleId;
    card.card_id = card.card_id || `test_card_${index + 1}`;
    card.card_title = card.card_title || `${card.card_type || 'card'} ${index + 1}`;

    if (card.card_type === 'solution') {
      card.hidden_until_solved ??= true;
    } else {
      card.hidden_until_solved ??= false;
    }
  });

  const seedBundles = [{ bundle_id: bundleId }];
  const context = {
    cards: safeCards,
    puzzle_bundles: enrichFixtureBundles(safeCards, seedBundles),
    case_state: {
      suspects: [],
      ...caseState
    }
  };

  if (debug) {
    printDebug('normalized_cards', context.cards);
    printDebug(
      'solution_cards',
      context.cards
        .filter((card) => card.card_type === 'solution')
        .map((card) => ({
          card_id: card.card_id,
          card_contents: card.card_contents
        }))
    );
  }

  try {
    await cardQualityAgent(context);
    if (debug) {
      printDebug('grounding_decision', {
        stage: 'card_quality_agent',
        result: 'pass'
      });
    }

    await bundleStructureValidatorAgent(context);
    if (debug) {
      printDebug('grounding_decision', {
        stage: 'bundle_structure_validator_agent',
        result: 'pass'
      });
    }
  } catch (error) {
    if (debug) {
      printDebug('failure_reason', {
        message: String(error?.message || error),
        name: error?.name || 'Error'
      });
    }
    throw error;
  }

  return true;
}
