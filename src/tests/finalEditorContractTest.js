import { applyFinalEditorResult } from '../agents/finalEditorAgent.js';
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

function makeCards() {
  return [
    {
      card_id: 'puzzle-1',
      card_type: 'puzzle',
      card_title: 'Archive Access Puzzle',
      card_contents: 'Compare the watch log and route sketch.',
      act: 2,
      bundle_id: 'puzzle_bundle_001',
      difficulty: 'medium',
      required_card_ids: ['item-1', 'upstream-item-1'],
      unlock_card_ids: ['clue-1'],
      hidden_until_solved: false
    },
    {
      card_id: 'item-1',
      card_type: 'item',
      card_title: 'Route Sketch',
      card_contents: 'A map of the service halls.',
      act: 2,
      bundle_id: 'puzzle_bundle_001',
      hidden_until_solved: false
    },
    {
      card_id: 'clue-1',
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
  ];
}

function makeEditedCards() {
  return [
    {
      card_id: 'item-1',
      card_type: 'item',
      card_title: 'Route Sketch Revised',
      card_contents: 'A cleaner map of the service halls.',
      act: 2
    },
    {
      card_id: 'clue-1',
      card_type: 'clue',
      card_title: 'Archive Access Contradiction Revised',
      card_contents: 'The route timing does not work.',
      act: 3
    },
    {
      card_id: 'puzzle-1',
      card_type: 'puzzle',
      card_title: 'Archive Access Puzzle Revised',
      card_contents: 'Compare the route sketch and watch log.',
      act: 2
    },
    {
      card_id: 'upstream-item-1',
      card_type: 'item',
      card_title: 'Watch Log Revised',
      card_contents: 'A revised corridor activity log.',
      act: 1
    }
  ];
}

function run() {
  {
    const existingCards = makeCards();
    const nextCards = applyFinalEditorResult(existingCards, makeEditedCards());

    assert(nextCards.length === existingCards.length, 'final editor should preserve card count');
    assert(JSON.stringify(nextCards.map((card) => card.card_id)) === JSON.stringify(existingCards.map((card) => card.card_id)), 'final editor should preserve original card order');
    assert(nextCards[0].card_title === 'Archive Access Puzzle Revised', 'final editor should apply title edits by card_id');
    assert(nextCards[2].hidden_until_solved === true, 'final editor should preserve hidden unlock metadata');
    assert(nextCards[0].unlock_card_ids[0] === 'clue-1', 'final editor should preserve unlock ids');

    validateBundleIntegrity({
      cards: nextCards,
      puzzle_bundles: [
        {
          bundle_id: 'puzzle_bundle_001',
          card_ids: ['puzzle-1', 'item-1', 'clue-1']
        }
      ]
    });
  }

  {
    expectFailure(
      () => applyFinalEditorResult(makeCards(), makeEditedCards().slice(0, 3)),
      /preserve card count/
    );
  }

  {
    const duplicateIds = makeEditedCards();
    duplicateIds[1] = { ...duplicateIds[1], card_id: 'item-1' };
    expectFailure(
      () => applyFinalEditorResult(makeCards(), duplicateIds),
      /duplicate card_id/
    );
  }

  {
    const changedIds = makeEditedCards();
    changedIds[0] = { ...changedIds[0], card_id: 'item-1-new' };
    expectFailure(
      () => applyFinalEditorResult(makeCards(), changedIds),
      /exact card_id set/
    );
  }

  console.log('FINAL EDITOR CONTRACT TEST PASSED');
}

run();
