import assert from 'node:assert/strict';

import { canLinkUnlockToPuzzle } from '../agents/bundleLinkerAgent.js';
import { flattenBundle, hasMeaningfulActionableGain, isPlaceholderTitle } from '../agents/puzzleAgent.js';

function testHiddenActDependencyRejected() {
  const sourceBundle = {
    puzzle: {
      act: 2
    }
  };
  const targetBundle = {
    puzzle: {
      act: 1
    }
  };
  const unlockCard = {
    card_id: 'unlock-1',
    act: 1,
    hidden_until_solved: true
  };

  assert.equal(
    canLinkUnlockToPuzzle(sourceBundle, unlockCard, targetBundle, []),
    false,
    'hidden unlocks from later-act bundles must not link into earlier-act puzzles'
  );
}

function testPlaceholderPatternsRejected() {
  assert.equal(isPlaceholderTitle('Puzzle Bundle 3 Card 4'), true);
  assert.equal(isPlaceholderTitle('Card 4'), true);
  assert.equal(isPlaceholderTitle('Bundle 12 Notes'), true);
  assert.equal(isPlaceholderTitle('Hidden Magnetic Cradle'), false);
}

function testGenericActionableGainRejected() {
  assert.equal(
    hasMeaningfulActionableGain('Narrows the suspect space through access, timeline, or object evidence from puzzle bundle 3.'),
    false,
    'generic actionable_gain boilerplate should force deterministic replacement'
  );
}

function testFlattenBundleReplacesPlaceholderTitles() {
  const bundle = flattenBundle({
    puzzle_type: 'cipher',
    difficulty: 'medium',
    actionable_gain: 'Decode the note to reveal a hidden location clue.',
    solution_summary: 'Compare both records together to find the contradiction.',
    cards: [
      {
        card_ref: 'p1',
        card_type: 'puzzle',
        card_title: 'Cipher Test',
        card_contents: 'Solve this puzzle.',
        act: 2
      },
      {
        card_ref: 'i1',
        card_type: 'item',
        card_title: 'Threatening Messages',
        card_contents: 'Unsigned notes.',
        act: 2
      },
      {
        card_ref: 'i2',
        card_type: 'item',
        card_title: 'Puzzle Bundle 3 Card 4',
        card_contents: 'Placeholder leaked through.',
        act: 2,
        hidden_until_solved: true
      }
    ]
  }, 2, new Map());

  assert.equal(
    bundle.cards.some((card) => isPlaceholderTitle(card.card_title)),
    false,
    'flattenBundle should not emit placeholder titles'
  );
}

function run() {
  testHiddenActDependencyRejected();
  testPlaceholderPatternsRejected();
  testGenericActionableGainRejected();
  testFlattenBundleReplacesPlaceholderTitles();
  console.log('bundleRegressionTest passed');
}

run();
