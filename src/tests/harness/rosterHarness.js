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
  {
    const cards = [
      { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash', card_contents: '...' },
      { card_id: 't1', card_type: 'clue', card_title: 'Witness Statement', card_contents: 'Victor Ash argued with Luna Silverfang.' },
      { card_id: 'l1', card_type: 'item', card_title: 'Lobby Ledger', card_contents: 'Signed by Victor Ash.' }
    ];
    const context = makeMockContext(cards);
    const before = JSON.stringify(context.cards);

    const out = await rosterIntegrityValidatorAgent(context);
    assert(JSON.stringify(out.cards) === before, 'rosterHarness: validator must not mutate cards');

    const warnings = (out.debug?.warning_log || []).filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 0, 'rosterHarness: expected no warnings for roster-only names');
  }

  {
    const cards = [
      { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash', card_contents: '...' },
      { card_id: 'x1', card_type: 'item', card_title: 'Vial', card_contents: 'Lady Morgana was seen clutching it.' },
      { card_id: 'x2', card_type: 'clue', card_title: 'Rumor', card_contents: 'Detective Clara spoke with Luna Silverfang.' },
      { card_id: 'x3', card_type: 'location', card_title: 'The Ash Pit', card_contents: 'The Ash Pit was closed early.' }
    ];
    const context = makeMockContext(cards);
    const before = JSON.stringify(context.cards);

    const out = await rosterIntegrityValidatorAgent(context);
    assert(JSON.stringify(out.cards) === before, 'rosterHarness: validator must not mutate cards');

    const warnings = (out.debug?.warning_log || []).filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 1, 'rosterHarness: expected a warning for ghost names');
    assert(
      Array.isArray(warnings[0].unknown_phrases) &&
        warnings[0].unknown_phrases.includes('Lady Morgana') &&
        warnings[0].unknown_phrases.includes('Detective Clara'),
      'rosterHarness: expected unknown_phrases to include ghost names'
    );
    assert(
      !warnings[0].unknown_phrases.includes('The Ash Pit'),
      'rosterHarness: stop-phrase locations must not be reported as unknown names'
    );
  }

  console.log('rosterHarness OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

