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

  const context = {
    cards: safeCards,
    puzzle_bundles: [{ bundle_id: bundleId }],
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
