import { cardQualityAgent } from '../../agents/cardQualityAgent.js';
import { bundleIntegrityValidatorAgent } from '../../agents/bundleIntegrityValidatorAgent.js';
import { normalizeContext } from '../../utils/context.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeMockContext(overrides = {}) {
  return normalizeContext({
    playerCount: 4,
    storyBlurb: 'Mock story',
    world: 'Mock world',
    solution: { killer: 'Luna Silverfang', method: 'Poison', location: 'Greenhouse', motive: 'Inheritance' },
    cards: [],
    puzzle_bundles: [],
    ...overrides
  });
}

function makeMockPuzzleBundle() {
  const upstream1 = {
    card_id: 'upstream-item-1',
    card_type: 'item',
    card_title: 'Watch Log',
    card_contents: 'A guard logged hallway movement at 9:10pm.',
    act: 1
  };
  const upstream2 = {
    card_id: 'upstream-clue-1',
    card_type: 'clue',
    card_title: 'Door Access Record',
    card_contents: 'Only one keycard opened the archive door after 9:00pm.',
    act: 1
  };

  const bundleId = 'puzzle_bundle_001';
  const itemId = 'bundle-item-1';
  const unlockId = 'bundle-clue-1';
  const puzzleId = 'bundle-puzzle-1';

  const item = {
    card_id: itemId,
    card_type: 'item',
    card_title: 'Route Sketch',
    card_contents: 'A hand-drawn map of service corridors and doors.',
    act: 2,
    bundle_id: bundleId,
    hidden_until_solved: false
  };
  const unlock = {
    card_id: unlockId,
    card_type: 'clue',
    card_title: 'Archive Route Contradiction',
    card_contents: 'The route shown cannot match the access record timing.',
    act: 2,
    bundle_id: bundleId,
    hidden_until_solved: true,
    evidence_strength: 'supporting'
  };
  const puzzle = {
    card_id: puzzleId,
    card_type: 'puzzle',
    card_title: 'Archive Access Puzzle',
    card_contents: 'Cross-reference the route sketch with the access record and watch log.',
    act: 2,
    bundle_id: bundleId,
    hidden_until_solved: false,
    difficulty: 'medium',
    required_card_ids: [itemId, upstream2.card_id, upstream1.card_id],
    unlock_card_ids: [unlockId],
    actionable_gain: 'Contradicts the stated timeline and narrows the suspect space via access and movement evidence.',
    solution_summary: 'Compare both records together to find the timing contradiction that narrows access to the archive.'
  };

  return {
    context: makeMockContext({
      cards: [upstream1, upstream2, puzzle, item, unlock],
      puzzle_bundles: [
        {
          bundle_id: bundleId,
          card_ids: [puzzleId, itemId, unlockId]
        }
      ]
    }),
    ids: { bundleId, puzzleId, itemId, unlockId, upstreamIds: [upstream1.card_id, upstream2.card_id] }
  };
}

async function run() {
  const { context, ids } = makeMockPuzzleBundle();

  const beforeCardsJson = JSON.stringify(context.cards);
  await cardQualityAgent(context);
  assert(JSON.stringify(context.cards) === beforeCardsJson, 'puzzleHarness: cardQualityAgent must not drop well-formed mocked cards');

  const bundleCards = context.cards.filter((c) => c.bundle_id === ids.bundleId);
  const puzzle = bundleCards.find((c) => c.card_type === 'puzzle');
  const unlock = bundleCards.find((c) => c.card_id === ids.unlockId);

  assert(bundleCards.length === 3, 'puzzleHarness: expected exactly 3 bundle cards (puzzle + item + unlock)');
  assert(puzzle, 'puzzleHarness: missing puzzle card');
  assert(Array.isArray(puzzle.required_card_ids) && puzzle.required_card_ids.length >= 2, 'puzzleHarness: required_card_ids missing/trivial');
  assert(Array.isArray(puzzle.unlock_card_ids) && puzzle.unlock_card_ids.length >= 1, 'puzzleHarness: unlock_card_ids missing/trivial');
  assert(!puzzle.required_card_ids.includes(puzzle.card_id), 'puzzleHarness: puzzle cannot require itself');
  assert(unlock?.hidden_until_solved === true, 'puzzleHarness: unlock card must be hidden_until_solved');
  assert(puzzle.unlock_card_ids.includes(ids.unlockId), 'puzzleHarness: puzzle must reference unlock card id');

  const cardIds = new Set(context.cards.map((c) => c.card_id));
  for (const requiredId of puzzle.required_card_ids) {
    assert(cardIds.has(requiredId), `puzzleHarness: required card missing from cards: ${requiredId}`);
    assert(requiredId !== ids.unlockId, 'puzzleHarness: puzzle cannot require hidden unlock card');
  }
  for (const unlockId of puzzle.unlock_card_ids) {
    assert(cardIds.has(unlockId), `puzzleHarness: unlock card missing from cards: ${unlockId}`);
    assert(bundleCards.some((c) => c.card_id === unlockId), 'puzzleHarness: unlock card must be inside bundle');
  }

  await bundleIntegrityValidatorAgent(context);

  const connectivity = context.debug?.connectivity || [];
  const node = connectivity.find((n) => n.bundle_id === ids.bundleId);
  assert(node, 'puzzleHarness: expected connectivity node for bundle');
  assert(typeof node.chain_depth === 'number' && node.chain_depth >= 1, 'puzzleHarness: expected chain_depth >= 1');

  console.log('puzzleHarness OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

