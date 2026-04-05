import assert from 'node:assert/strict';

import { bundleLinkerAgent, canLinkUnlockToPuzzle } from '../agents/bundleLinkerAgent.js';
import { flattenBundle } from '../agents/bundleFinalizeAgent.js';

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

function testFlattenBundleValidatesCoreShape() {
  const upstreamRefs = new Map([
    ['bundle_unlock_002', 'upstream-solution-2']
  ]);
  const bundle = flattenBundle({
    clue_target: {
      fact: 'The archive door opened at 11:20 PM.',
      category: 'timing',
      puzzle_type_hint: 'timeline',
      difficulty_hint: 'medium',
      act: 2
    },
    puzzle_type: 'cipher',
    actionable_gain: 'Decode the note to reveal a hidden location clue.',
    cards: [
      {
        card_type: 'puzzle',
        card_title: 'Cipher Test',
        card_contents: 'Solve this puzzle.'
      },
      {
        card_type: 'evidence',
        card_title: 'Threatening Messages',
        card_contents: 'Unsigned notes.'
      },
      {
        card_type: 'evidence',
        card_title: 'Secondary Evidence',
        card_contents: 'Placeholder leaked through.'
      },
      {
        card_type: 'evidence',
        card_title: 'Archive Watch Note',
        card_contents: 'The watch note records movement near the archive at 11:20 PM.'
      },
      {
        card_type: 'gate',
        card_title: 'Archive Gate Summary',
        card_contents: 'Visible summary sheet: compare the archive watch note with the threat messages before answering.'
      },
      {
        card_type: 'solution',
        card_title: 'Archive Clue',
        card_contents: 'The archive door opened at 11:20 PM.'
      }
    ]
  }, 2, upstreamRefs);

  assert.equal(bundle.cards.length, 6, 'flattenBundle should emit three visible evidence cards, one gate card, one hidden unlock, and one puzzle');
  const puzzle = bundle.cards.find((card) => card.card_type === 'puzzle');
  const unlockCards = bundle.cards.filter((card) => card.card_type === 'solution' && card.hidden_until_solved === true);
  assert.equal(bundle.puzzle_type, 'timeline', 'flattenBundle should hard-lock bundle puzzle_type from clue target');
  assert.equal(puzzle.puzzle_type, 'timeline', 'flattenBundle should hard-lock puzzle card puzzle_type from clue target');
  assert.equal(Array.isArray(puzzle.required_card_refs), true, 'puzzle should include required_card_refs');
  assert.equal(Array.isArray(puzzle.unlock_card_refs), true, 'puzzle should include unlock_card_refs');
  assert.equal(Array.isArray(puzzle.unlock_card_ids), true, 'puzzle should include unlock_card_ids');
  assert.equal(puzzle.unlock_card_ids.length === 1, true, 'puzzle should resolve one unlock card');
  assert.equal(puzzle.required_card_ids.length === 5, true, 'puzzle should resolve prior unlock plus gate and local evidence refs to ids');
  assert.equal(
    unlockCards.length === 1,
    true,
    'bundle should contain one hidden unlock card for chaining'
  );
  assert.equal(unlockCards[0].card_contents, 'The archive door opened at 11:20 PM.', 'flattenBundle should preserve solution clue text');
  assert.equal(bundle.cards[bundle.cards.length - 1].card_type, 'puzzle', 'puzzle should be emitted last');
}

async function testBundleLinkerCompletesPartialDependencySets() {
  const cards = [
    {
      card_id: 'bundle_a_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle A Puzzle',
      card_contents: 'Compare the registry cards.',
      act: 2,
      bundle_id: 'puzzle_bundle_001',
      hidden_until_solved: false,
      difficulty: 'medium',
      required_card_ids: ['bundle_a_gate'],
      unlock_card_ids: ['bundle_a_unlock']
    },
    {
      card_id: 'bundle_a_gate',
      card_type: 'item',
      card_title: 'Bundle A Gate',
      card_contents: 'Visible gate.',
      act: 2,
      bundle_id: 'puzzle_bundle_001',
      hidden_until_solved: false
    },
    {
      card_id: 'bundle_a_unlock',
      card_type: 'solution',
      card_title: 'Bundle A Unlock',
      card_contents: 'Hidden unlock.',
      act: 2,
      bundle_id: 'puzzle_bundle_001',
      hidden_until_solved: true
    },
    {
      card_id: 'bundle_b_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle B Puzzle',
      card_contents: 'Compare the route sheet.',
      act: 2,
      bundle_id: 'puzzle_bundle_002',
      hidden_until_solved: false,
      difficulty: 'medium',
      required_card_ids: ['bundle_b_gate', 'bundle_a_unlock'],
      unlock_card_ids: ['bundle_b_unlock']
    },
    {
      card_id: 'bundle_b_gate',
      card_type: 'item',
      card_title: 'Bundle B Gate',
      card_contents: 'Visible gate.',
      act: 2,
      bundle_id: 'puzzle_bundle_002',
      hidden_until_solved: false
    },
    {
      card_id: 'bundle_b_unlock',
      card_type: 'solution',
      card_title: 'Bundle B Unlock',
      card_contents: 'Hidden unlock.',
      act: 2,
      bundle_id: 'puzzle_bundle_002',
      hidden_until_solved: true
    },
    {
      card_id: 'bundle_c_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle C Puzzle',
      card_contents: 'Compare the final records.',
      act: 3,
      bundle_id: 'puzzle_bundle_003',
      hidden_until_solved: false,
      difficulty: 'hard',
      required_card_ids: ['bundle_c_gate'],
      unlock_card_ids: ['bundle_c_unlock']
    },
    {
      card_id: 'bundle_c_gate',
      card_type: 'item',
      card_title: 'Bundle C Gate',
      card_contents: 'Visible gate.',
      act: 3,
      bundle_id: 'puzzle_bundle_003',
      hidden_until_solved: false
    },
    {
      card_id: 'bundle_c_unlock',
      card_type: 'solution',
      card_title: 'Bundle C Unlock',
      card_contents: 'Hidden unlock.',
      act: 3,
      bundle_id: 'puzzle_bundle_003',
      hidden_until_solved: true
    }
  ];

  const context = {
    cards,
    debug: {
      warning_log: []
    }
  };

  await bundleLinkerAgent(context);

  const bundleCPuzzle = context.cards.find((card) => card.card_id === 'bundle_c_puzzle');
  assert.equal(
    bundleCPuzzle.required_card_ids.includes('bundle_b_unlock'),
    true,
    'bundleLinkerAgent should fill a missing later dependency even when an earlier link already exists'
  );
}

async function testBundleLinkerWiresTreasureChain() {
  const cards = [
    {
      card_id: 'bundle_a_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle A Puzzle',
      card_contents: 'Compare the registry cards.',
      act: 1,
      bundle_id: 'puzzle_bundle_001',
      hidden_until_solved: false,
      difficulty: 'medium',
      required_card_ids: ['bundle_a_gate'],
      unlock_card_ids: ['bundle_a_unlock']
    },
    { card_id: 'bundle_a_gate', card_type: 'item', card_title: 'A Gate', card_contents: 'Visible', act: 1, bundle_id: 'puzzle_bundle_001', hidden_until_solved: false },
    { card_id: 'bundle_a_unlock', card_type: 'solution', card_title: 'A Unlock', card_contents: 'Killer fact', act: 1, bundle_id: 'puzzle_bundle_001', hidden_until_solved: true, meta: { fact_binding: 'killer' } },
    {
      card_id: 'bundle_b_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle B Puzzle',
      card_contents: 'Compare the route sheet.',
      act: 2,
      bundle_id: 'puzzle_bundle_002',
      hidden_until_solved: false,
      difficulty: 'medium',
      required_card_ids: ['bundle_b_gate'],
      unlock_card_ids: ['bundle_b_unlock']
    },
    { card_id: 'bundle_b_gate', card_type: 'item', card_title: 'B Gate', card_contents: 'Visible', act: 2, bundle_id: 'puzzle_bundle_002', hidden_until_solved: false },
    { card_id: 'bundle_b_unlock', card_type: 'solution', card_title: 'B Unlock', card_contents: 'Location fact', act: 2, bundle_id: 'puzzle_bundle_002', hidden_until_solved: true, meta: { fact_binding: 'location' } },
    {
      card_id: 'bundle_c_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle C Puzzle',
      card_contents: 'Compare the object records.',
      act: 3,
      bundle_id: 'puzzle_bundle_003',
      hidden_until_solved: false,
      difficulty: 'hard',
      required_card_ids: ['bundle_c_gate'],
      unlock_card_ids: ['bundle_c_unlock']
    },
    { card_id: 'bundle_c_gate', card_type: 'item', card_title: 'C Gate', card_contents: 'Visible', act: 3, bundle_id: 'puzzle_bundle_003', hidden_until_solved: false },
    { card_id: 'bundle_c_unlock', card_type: 'solution', card_title: 'C Unlock', card_contents: 'Treasure object fact', act: 3, bundle_id: 'puzzle_bundle_003', hidden_until_solved: true, meta: { fact_binding: 'treasure_object' } },
    {
      card_id: 'bundle_d_puzzle',
      card_type: 'puzzle',
      card_title: 'Bundle D Puzzle',
      card_contents: 'Compare the hiding-place records.',
      act: 3,
      bundle_id: 'puzzle_bundle_004',
      hidden_until_solved: false,
      difficulty: 'hard',
      required_card_ids: ['bundle_d_gate'],
      unlock_card_ids: ['bundle_d_unlock']
    },
    { card_id: 'bundle_d_gate', card_type: 'item', card_title: 'D Gate', card_contents: 'Visible', act: 3, bundle_id: 'puzzle_bundle_004', hidden_until_solved: false },
    { card_id: 'bundle_d_unlock', card_type: 'solution', card_title: 'D Unlock', card_contents: 'Treasure location fact', act: 3, bundle_id: 'puzzle_bundle_004', hidden_until_solved: true, meta: { fact_binding: 'treasure_location' } },
    { card_id: 'treasure_clue', card_type: 'clue', card_title: 'Treasure Lead', card_contents: 'The reliquary matters.', role: 'treasure', hidden_until_solved: true, meta: { treasure_stage: 'clue' } },
    { card_id: 'treasure_reveal', card_type: 'treasure', card_title: 'Demo Reliquary', card_contents: 'Host reveal text.', hidden_until_solved: true, act: 3 }
  ];

  const context = {
    cards,
    debug: { warning_log: [] }
  };

  await bundleLinkerAgent(context);

  const bundleCPuzzle = context.cards.find((card) => card.card_id === 'bundle_c_puzzle');
  const bundleDPuzzle = context.cards.find((card) => card.card_id === 'bundle_d_puzzle');
  assert.equal(bundleCPuzzle.unlock_card_ids.includes('treasure_clue'), true, 'treasure-object bundle should unlock treasure clue');
  assert.equal(bundleDPuzzle.unlock_card_ids.includes('treasure_reveal'), true, 'treasure-location bundle should unlock treasure reveal');
}

async function run() {
  testHiddenActDependencyRejected();
  testFlattenBundleValidatesCoreShape();
  await testBundleLinkerCompletesPartialDependencySets();
  await testBundleLinkerWiresTreasureChain();
  console.log('bundleRegressionTest passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
