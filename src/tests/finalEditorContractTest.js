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
      solve_instructions: 'Compare the watch log and route sketch, then state which route is impossible.',
      solution: 'The archive route is impossible at the logged time, so the stated alibi fails.',
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
      card_id: 'item-2',
      card_type: 'item',
      card_title: 'Service Hall Badge Log',
      card_contents: 'A badge record for the side corridor.',
      act: 2,
      bundle_id: 'puzzle_bundle_001',
      hidden_until_solved: false
    },
    {
      card_id: 'clue-1',
      card_type: 'solution',
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
      card_type: 'puzzle',
      card_title: 'Archive Access Puzzle Revised',
      card_contents: 'Compare the route sketch and watch log.',
      act: 2
    },
    {
      card_type: 'item',
      card_title: 'Route Sketch Revised',
      card_contents: 'A cleaner map of the service halls.',
      act: 2
    },
    {
      card_type: 'item',
      card_title: 'Service Hall Badge Log Revised',
      card_contents: 'A revised badge record for the side corridor.',
      act: 2
    },
    {
      card_type: 'solution',
      card_title: 'Archive Access Contradiction Revised',
      card_contents: 'The route timing does not work.',
      act: 3
    },
    {
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
    assert(nextCards[0].card_title === existingCards[0].card_title, 'final editor should not rewrite bundle puzzle cards');
    assert(nextCards[1].card_title === existingCards[1].card_title, 'final editor should not rewrite bundle evidence cards');
    assert(nextCards[3].card_title === existingCards[3].card_title, 'final editor should not rewrite bundle solution cards');
    assert(nextCards[3].hidden_until_solved === true, 'final editor should preserve hidden unlock metadata');
    assert(nextCards[0].unlock_card_ids[0] === 'clue-1', 'final editor should preserve unlock ids');
    assert(nextCards[0].solve_instructions === existingCards[0].solve_instructions, 'final editor should preserve solve instructions');
    assert(nextCards[0].solution === existingCards[0].solution, 'final editor should preserve solution');
    assert(nextCards[4].card_title === 'Watch Log Revised', 'final editor should still edit non-bundle cards');

    validateBundleIntegrity({
      cards: nextCards,
      puzzle_bundles: [
        {
          bundle_id: 'puzzle_bundle_001',
          card_ids: ['puzzle-1', 'item-1', 'item-2', 'clue-1']
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
    const changedIds = makeEditedCards();
    changedIds.length = 3;
    expectFailure(
      () => applyFinalEditorResult(makeCards(), changedIds),
      /preserve card count/
    );
  }

  {
    const existingCards = [
      {
        card_id: 'game-1',
        card_type: 'game_card',
        card_title: 'Question the Broker',
        card_contents: 'Ask Victor where he was after the toast.',
        act: 2
      },
      {
        card_id: 'speech-1',
        card_type: 'host_speech',
        card_title: 'Act 1 Opening',
        card_contents: 'Welcome everyone.',
        act: 1
      }
    ];
    const editedCards = [
      {
        card_title: 'Question the Broker Revised',
        card_contents: 'Ask Victor to account for the minutes after the toast.',
        act: 3
      },
      {
        card_title: 'Act 1 Opening Revised',
        card_contents: 'Welcome to the evening.',
        act: 1
      }
    ];

    const nextCards = applyFinalEditorResult(existingCards, editedCards);
    assert(!('act' in nextCards[0]), 'final editor should strip act from game cards');
    assert(nextCards[1].act === 1, 'final editor should preserve act for non-game cards');
  }

  console.log('FINAL EDITOR CONTRACT TEST PASSED');
}

run();
