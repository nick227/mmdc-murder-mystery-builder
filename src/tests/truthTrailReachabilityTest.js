import assert from 'node:assert/strict';
import {
  collectFactBindingsFromReachableSolutions,
  computeSequentialUnlockSteps,
  expandReachableThroughPuzzles,
  findMissingTruthBindings,
  getInitiallyReachableCardIds
} from '../utils/truthTrailReachability.js';
import { truthTrailValidatorAgent } from '../agents/truthTrailValidatorAgent.js';

function makeChainCards() {
  const e1 = { card_id: 'e1', card_type: 'clue', hidden_until_solved: false };
  const p1 = {
    card_id: 'p1',
    card_type: 'puzzle',
    required_card_ids: ['e1'],
    unlock_card_ids: ['s1']
  };
  const s1 = {
    card_id: 's1',
    card_type: 'solution',
    hidden_until_solved: true,
    meta: { fact_binding: 'killer' }
  };

  const e2 = { card_id: 'e2', card_type: 'clue', hidden_until_solved: false };
  const p2 = {
    card_id: 'p2',
    card_type: 'puzzle',
    required_card_ids: ['e2', 's1'],
    unlock_card_ids: ['s2']
  };
  const s2 = {
    card_id: 's2',
    card_type: 'solution',
    hidden_until_solved: true,
    meta: { fact_binding: 'location' }
  };

  const e3 = { card_id: 'e3', card_type: 'clue', hidden_until_solved: false };
  const p3 = {
    card_id: 'p3',
    card_type: 'puzzle',
    required_card_ids: ['e3', 's2'],
    unlock_card_ids: ['s3']
  };
  const s3 = {
    card_id: 's3',
    card_type: 'solution',
    hidden_until_solved: true,
    meta: { fact_binding: 'treasure_object' }
  };

  const e4 = { card_id: 'e4', card_type: 'clue', hidden_until_solved: false };
  const p4 = {
    card_id: 'p4',
    card_type: 'puzzle',
    required_card_ids: ['e4', 's3'],
    unlock_card_ids: ['s4']
  };
  const s4 = {
    card_id: 's4',
    card_type: 'solution',
    hidden_until_solved: true,
    meta: { fact_binding: 'treasure_location' }
  };

  return [e1, p1, s1, e2, p2, s2, e3, p3, s3, e4, p4, s4];
}

const initial = getInitiallyReachableCardIds(makeChainCards());
assert(initial.has('e1'));
assert(!initial.has('s1'));

const reachable = expandReachableThroughPuzzles(makeChainCards(), initial);
assert(reachable.has('s4'));

const bindings = collectFactBindingsFromReachableSolutions(makeChainCards(), reachable);
assert.deepEqual(
  [...bindings].sort(),
  ['killer', 'location', 'treasure_location', 'treasure_object']
);

assert.equal(findMissingTruthBindings(bindings).length, 0);

const seq = computeSequentialUnlockSteps(makeChainCards(), initial);
assert.equal(seq.sequential_puzzle_steps, 4);
assert.equal(seq.firstSeenIteration.get('s1'), 1);
assert.equal(seq.firstSeenIteration.get('s4'), 4);

await truthTrailValidatorAgent({ cards: makeChainCards() });

await assert.rejects(
  () => truthTrailValidatorAgent({
    cards: makeChainCards().slice(0, 6)
  }),
  /missing reachable fact_binding\(s\): treasure_object, treasure_location/i
);

await assert.rejects(
  () => truthTrailValidatorAgent({
    cards: [
      { card_id: 'e1', card_type: 'clue', hidden_until_solved: false },
      {
        card_id: 'p1',
        card_type: 'puzzle',
        required_card_ids: ['e1'],
        unlock_card_ids: ['s1', 's2']
      },
      {
        card_id: 's1',
        card_type: 'solution',
        hidden_until_solved: true,
        meta: { fact_binding: 'killer' }
      },
      {
        card_id: 's2',
        card_type: 'solution',
        hidden_until_solved: true,
        meta: { fact_binding: 'location' }
      },
      { card_id: 'e2', card_type: 'clue', hidden_until_solved: false },
      {
        card_id: 'p2',
        card_type: 'puzzle',
        required_card_ids: ['e2', 's1'],
        unlock_card_ids: ['s3', 's4']
      },
      {
        card_id: 's3',
        card_type: 'solution',
        hidden_until_solved: true,
        meta: { fact_binding: 'treasure_object' }
      },
      {
        card_id: 's4',
        card_type: 'solution',
        hidden_until_solved: true,
        meta: { fact_binding: 'treasure_location' }
      }
    ]
  }),
  /sequential_puzzle_steps 2 < required minimum \(3\)/i
);

console.log('truthTrailReachabilityTest OK');
