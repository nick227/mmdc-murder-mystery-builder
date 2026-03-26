import { rosterIntegrityValidatorAgent } from '../agents/rosterIntegrityValidatorAgent.js';

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

function baseContext(cards) {
  return {
    playerCount: 4,
    storyBlurb: 'Test story',
    world: 'Test world',
    solution: { killer: 'Luna Silverfang', method: 'x', location: 'y', motive: 'z' },
    cards,
    debug: { warning_log: [] }
  };
}

async function run() {
  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash', card_contents: '...' },
      { card_id: 'x1', card_type: 'clue', card_title: 'Witness Statement', card_contents: 'Victor Ash argued with Luna Silverfang.' },
      { card_id: 'x3', card_type: 'item', card_title: 'Old Key', card_contents: 'Found near The Ash Pit.' }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 0, 'expected no roster integrity warnings for roster-only names');
  }

  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash', card_contents: '...' },
      { card_id: 'x2', card_type: 'item', card_title: 'Vial', card_contents: 'Lady Morgana was seen clutching it.' }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 1, 'expected a roster integrity warning for unknown phrase');
    assert(
      Array.isArray(warnings[0].unknown_phrases) && warnings[0].unknown_phrases.includes('Lady Morgana'),
      'expected unknown_phrases to include Lady Morgana'
    );
  }

  console.log('rosterIntegrityValidatorTest OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

