import { validateBundleIntegrity } from '../utils/puzzleBundles.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectFailure(fn, pattern) {
  try {
    fn();
  } catch (error) {
    if (pattern.test(String(error.message || ''))) {
      return;
    }
    throw error;
  }

  throw new Error(`Expected failure matching ${pattern}`);
}

function makeBaseContext() {
  const puzzleId = 'puzzle-1';
  const itemId = 'item-1';
  const unlockId = 'clue-1';

  return {
    cards: [
      {
        card_id: puzzleId,
        card_type: 'puzzle',
        card_title: 'Archive Access Puzzle',
        card_contents: 'Compare the watch log and route sketch.',
        act: 2,
        bundle_id: 'puzzle_bundle_001',
        difficulty: 'medium',
        required_card_ids: [itemId, 'upstream-item-1'],
        unlock_card_ids: [unlockId],
        hidden_until_solved: false
      },
      {
        card_id: itemId,
        card_type: 'item',
        card_title: 'Route Sketch',
        card_contents: 'A map of the service halls.',
        act: 2,
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false
      },
      {
        card_id: unlockId,
        card_type: 'clue',
        card_title: 'Archive Access Contradiction',
        card_contents: 'One route was impossible at the stated time.',
        act: 2,
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: true
      },
      {
        card_id: 'upstream-item-1',
        card_type: 'item',
        card_title: 'Watch Log',
        card_contents: 'A guard recorded corridor activity.',
        act: 1
      }
    ],
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_001',
        card_ids: [puzzleId, itemId, unlockId]
      }
    ]
  };
}

function run() {
  {
    const context = makeBaseContext();
    validateBundleIntegrity(context);
  }

  {
    const context = makeBaseContext();
    context.cards = context.cards.filter((card) => card.card_id !== 'clue-1');
    expectFailure(() => validateBundleIntegrity(context), /card count changed|missing card_ids|dropped unlock card/);
  }

  {
    const context = makeBaseContext();
    context.cards.push({ ...context.cards[0] });
    expectFailure(() => validateBundleIntegrity(context), /duplicate card_id/);
  }

  {
    const context = makeBaseContext();
    const unlock = context.cards.find((card) => card.card_id === 'clue-1');
    unlock.hidden_until_solved = false;
    expectFailure(() => validateBundleIntegrity(context), /no longer hidden/);
  }

  {
    const context = makeBaseContext();
    const unlock = context.cards.find((card) => card.card_id === 'clue-1');
    unlock.bundle_id = 'puzzle_bundle_999';
    expectFailure(() => validateBundleIntegrity(context), /card count changed|inconsistent bundle_id|escaped bundle/);
  }

  {
    const context = makeBaseContext();
    const remappedCards = context.cards.map((card) => {
      if (card.bundle_id !== 'puzzle_bundle_001') {
        return card;
      }
      return {
        ...card,
        card_id: `${card.card_id}-new`,
        required_card_ids: Array.isArray(card.required_card_ids)
          ? card.required_card_ids.map((id) => (id === 'item-1' ? 'item-1-new' : id))
          : card.required_card_ids,
        unlock_card_ids: Array.isArray(card.unlock_card_ids)
          ? card.unlock_card_ids.map((id) => (id === 'clue-1' ? 'clue-1-new' : id))
          : card.unlock_card_ids
      };
    });

    context.cards = remappedCards;
    validateBundleIntegrity(context, { allowIdRemap: true });
    assert(
      JSON.stringify(context.puzzle_bundles[0].card_ids) === JSON.stringify(['puzzle-1-new', 'item-1-new', 'clue-1-new']),
      'allowIdRemap should rewrite bundle.card_ids'
    );
  }

  console.log('BUNDLE INTEGRITY TEST PASSED');
}

run();
