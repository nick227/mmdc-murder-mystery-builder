import { cardQualityAgent } from '../../agents/cardQualityAgent.js';
import { normalizeContext } from '../../utils/context.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeMockContext(cards) {
  return normalizeContext({
    playerCount: 4,
    storyBlurb: 'Mock story',
    world: 'Mock world',
    solution: { killer: 'Luna Silverfang', method: 'x', location: 'y', motive: 'z' },
    cards,
    debug: { warning_log: [], connectivity: [], rejection_log: [], state_change_flags: [], gain_counts: {}, strength_counts: {}, bundle_stats: [] }
  });
}

function bundleCards({ bundleId, act, requiredIds, unlockId, actionableGain, solutionSummary }) {
  const puzzleId = `${bundleId}-p`;
  const visible1 = `${bundleId}-v1`;
  const visible2 = `${bundleId}-v2`;

  return [
    {
      card_id: puzzleId,
      card_type: 'puzzle',
      card_title: `Puzzle ${bundleId}`,
      card_contents: 'Compare the referenced cards to find the contradiction.',
      act,
      bundle_id: bundleId,
      hidden_until_solved: false,
      difficulty: 'medium',
      required_card_ids: requiredIds,
      unlock_card_ids: [unlockId],
      actionable_gain: actionableGain,
      solution_summary: solutionSummary
    },
    {
      card_id: visible1,
      card_type: 'item',
      card_title: `Visible A ${bundleId}`,
      card_contents: 'A visible item.',
      act,
      bundle_id: bundleId,
      hidden_until_solved: false
    },
    {
      card_id: visible2,
      card_type: 'clue',
      card_title: `Visible B ${bundleId}`,
      card_contents: 'A visible clue.',
      act,
      bundle_id: bundleId,
      hidden_until_solved: false
    },
    {
      card_id: unlockId,
      card_type: 'clue',
      card_title: `Unlock ${bundleId}`,
      card_contents: 'A hidden clue revealed when solved.',
      act,
      bundle_id: bundleId,
      hidden_until_solved: true,
      evidence_strength: 'supporting'
    }
  ];
}

async function run() {
  const unlockClue1 = 'clue1';

  const cards = [
    ...bundleCards({
      bundleId: 'bundleA',
      act: 2,
      requiredIds: ['bundleA-v1', 'bundleA-v2'],
      unlockId: unlockClue1,
      actionableGain: 'Narrows the suspect space by access evidence.',
      solutionSummary: 'Compare both visible cards together to find the access contradiction.'
    }),
    ...bundleCards({
      bundleId: 'bundleB',
      act: 3,
      requiredIds: ['bundleB-v1', unlockClue1],
      unlockId: 'bundleB-unlock',
      actionableGain: 'Narrows the suspect space by timeline evidence.',
      solutionSummary: 'Compare both required cards together to find the timeline contradiction.'
    }),
    ...bundleCards({
      bundleId: 'bundleC',
      act: 2,
      requiredIds: ['bundleC-v1', 'bundleC-v2'],
      unlockId: 'bundleC-unlock',
      actionableGain: 'Narrows the suspect space by object evidence.',
      solutionSummary: 'Compare both visible cards together to find the object link.'
    })
  ];

  const context = makeMockContext(cards);
  await cardQualityAgent(context);

  const nodes = context.debug?.connectivity || [];
  const a = nodes.find((n) => n.bundle_id === 'bundleA');
  const b = nodes.find((n) => n.bundle_id === 'bundleB');
  const c = nodes.find((n) => n.bundle_id === 'bundleC');

  assert(a && b && c, 'connectivityHarness: expected connectivity nodes for all bundles');

  assert(a.out_degree === 1 && a.in_degree === 0, 'connectivityHarness: bundleA should have edge to bundleB');
  assert(b.in_degree === 1, 'connectivityHarness: bundleB should have incoming edge from bundleA');
  assert(c.in_degree === 0 && c.out_degree === 0, 'connectivityHarness: bundleC should be isolated');

  assert(a.chain_depth === 2, 'connectivityHarness: expected chain depth 2 for bundleA');
  assert(b.chain_depth === 1, 'connectivityHarness: expected chain depth 1 for bundleB');
  assert(c.chain_depth === 1, 'connectivityHarness: expected chain depth 1 for bundleC');

  const connectivityWarnings = (context.debug?.warning_log || []).filter((w) => w.stage === 'connectivity');
  assert(
    connectivityWarnings.some((w) => w.bundle_id === 'bundleC' && w.reason === 'isolated_bundle'),
    'connectivityHarness: expected isolated_bundle warning for bundleC'
  );

  console.log('connectivityHarness OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

