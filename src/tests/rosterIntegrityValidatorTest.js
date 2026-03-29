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
      { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang, The Quiet Alchemist', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash, The Restless Broker', card_contents: '...' },
      { card_id: 'l1', card_type: 'location', card_title: 'The Willow Glade', card_contents: '...' },
      { card_id: 'x1', card_type: 'clue', card_title: 'Witness Statement', card_contents: 'Victor Ash argued with Luna Silverfang in Willow Glade.' },
      { card_id: 'x3', card_type: 'item', card_title: 'Old Key', card_contents: 'Found near The Ash Pit inside Bibliotheca Arcana.' }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 0, 'expected no roster integrity warnings for roster base names or world phrases');
  }

  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Lady Viola Ravenscroft, The Enigmatic Hostess', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash', card_contents: '...' },
      { card_id: 'p1', card_type: 'person', card_title: 'Lord Pembroke', card_contents: '...' },
      { card_id: 'l1', card_type: 'location', card_title: 'The Ancient Yew Tree', card_contents: '...' },
      { card_id: 'x2', card_type: 'game_card', card_title: 'Prompt', card_contents: 'Encourage Lady Viola to explain the scarf.' }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 0, 'expected no roster integrity warning for imperative host-card phrases using short aliases');
  }

  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Mistress Viola, The Ambitious Thespian', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Master Giles Thorncroft, The Silent Gardener', card_contents: '...' },
      { card_id: 'p1', card_type: 'person', card_title: 'Lord Pembroke', card_contents: '...' },
      { card_id: 'l1', card_type: 'location', card_title: 'The Ancient Yew Tree', card_contents: '...' },
      { card_id: 'x1', card_type: 'clue', card_title: 'Witness', card_contents: 'Lord Pembroke saw Viola and Thorncroft near the Ancient Yew Tree while the Ambitious Thespian rehearsed lines.' }
    ]);
    context.worldEntities = {
      people: [{ name: 'Lord Pembroke' }],
      locations: [{ name: 'Stratford Manor' }]
    };

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 0, 'expected no roster integrity warning for person/world aliases and character title fragments');
  }

  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Lady Viola Ravenscroft, The Ambitious Actress', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Master Ben Jonson, The Rival Playwright', card_contents: '...' },
      { card_id: 'p1', card_type: 'person', card_title: 'Master William Shakespeare', card_contents: '...' },
      { card_id: 'l1', card_type: 'location', card_title: 'The Ivy-Covered Pavilion', card_contents: '...' },
      {
        card_id: 'x1',
        card_type: 'game_card',
        card_title: 'Prompt',
        card_contents:
          'Mention Ben Jonson near the Covered Pavilion. Then resolve the Ownership Confirmation and Costume Correlation about Lady Viola Ravenscroft.'
      }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(
      warnings.length === 0,
      'expected no roster integrity warning for honorific-stripped names, hyphenated location fragments, or puzzle label phrases'
    );
  }

  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Lady Viola', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Christopher Marlowe', card_contents: '...' },
      {
        card_id: 'l1',
        card_type: 'location',
        card_title: 'Yew Tree Alcove',
        card_contents: 'A wooden structure styled after the Globe Theatre.'
      },
      {
        card_id: 'x1',
        card_type: 'story_act',
        card_title: 'Act 1',
        card_contents: 'Meanwhile, Christopher Marlowe could not reach the Yew Tree in time.'
      }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(
      warnings.length === 0,
      'expected no roster integrity warning for foundation-world phrases, discourse connectors, or location subphrases'
    );
  }

  {
    const context = baseContext([
      { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Victor Ash', card_contents: '...' },
      { card_id: 'x2', card_type: 'item', card_title: 'Vial', card_contents: 'Lady Morgana was seen clutching it while Marcellus, the Assistant Curator, watched from the doorway.' }
    ]);

    const out = await rosterIntegrityValidatorAgent(context);
    const warnings = out.debug.warning_log.filter((w) => w.stage === 'roster_integrity');
    assert(warnings.length === 1, 'expected a roster integrity warning for unknown phrase');
    assert(
      Array.isArray(warnings[0].unknown_phrases) &&
        warnings[0].unknown_phrases.includes('Lady Morgana') &&
        warnings[0].unknown_phrases.includes('Marcellus'),
      'expected unknown_phrases to include true ghost names'
    );
  }

  console.log('rosterIntegrityValidatorTest OK');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

