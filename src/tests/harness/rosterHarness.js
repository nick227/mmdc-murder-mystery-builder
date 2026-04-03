import { rosterIntegrityValidatorAgent } from '../../agents/rosterIntegrityValidatorAgent.js';
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
    debug: { warning_log: [] }
  });
}

async function run() {
  const cards = [
    { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang, The Quiet Alchemist', card_contents: '...' },
    { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash, The Restless Broker', card_contents: '...' },
    { card_id: 't1', card_type: 'clue', card_title: 'Witness Statement', card_contents: 'Victor Ash argued with Luna Silverfang.' },
    { card_id: 'x1', card_type: 'item', card_title: 'Vial', card_contents: 'Lady Morgana was seen; Marcellus watched.' }
  ];
  const context = makeMockContext(cards);
  const before = JSON.stringify(context.cards);

  const out = await rosterIntegrityValidatorAgent(context);
  assert(JSON.stringify(out.cards) === before, 'rosterHarness: validator must not mutate cards');

  const warnings = (out.debug?.warning_log || []).filter((w) => w.stage === 'roster_integrity');
  assert(warnings.length === 0, 'rosterHarness: validator is a pass-through (no roster_integrity warnings)');

  console.log('rosterHarness OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
