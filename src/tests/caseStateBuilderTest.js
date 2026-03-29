import { buildCaseState } from '../utils/caseState.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const context = {
    coreTruth: {
      murder: {
        killer: 'Max Vinyl, The Ruthless Rival',
        victim: 'DJ Spinmaster',
        location: 'Rare Vinyl Vault',
        method: 'strangled DJ Spinmaster with a guitar cable',
        motive: 'steal the Lost Melody',
        summary: 'Max Vinyl confronted DJ Spinmaster in the Rare Vinyl Vault and killed him.',
        opportunity: 'slipped away during the party',
        why_others_could_not: [
          'Lila Groove was busy managing the event and had no access to the vault at the time',
          'Evelyn Echo Ramirez was monitoring the vault security system but was momentarily distracted',
          'Theo Marlowe was mingling with guests and had no physical access to the vault'
        ]
      },
      treasure: {
        object: 'Lost Melody',
        hiding_place: 'climate control panel'
      }
    },
    cards: [
      { card_id: 'c1', card_type: 'character', card_title: 'Lila Groove, The Keeper', card_contents: '...' },
      { card_id: 'c2', card_type: 'character', card_title: 'Max Vinyl, The Ruthless Rival', card_contents: '...' },
      { card_id: 'c3', card_type: 'character', card_title: 'Evelyn Echo Ramirez, The Engineer', card_contents: '...' },
      { card_id: 'c4', card_type: 'character', card_title: 'Theo Marlowe, The Archivist', card_contents: '...' }
    ],
    storyEntities: {
      people: [
        { name: 'DJ Spinmaster' }
      ]
    }
  };

  const caseState = buildCaseState(context);
  assert(caseState.killer_id === 'max_vinyl', 'killer_id should match playable suspect');
  assert(caseState.killer_name === 'Max Vinyl', 'killer_name should use the stripped display name');
  assert(caseState.victim_name === 'DJ Spinmaster', 'victim should prefer explicit core truth victim');
  assert(caseState.state_progression.viable_suspects.length === 4, 'all suspects should start viable');
  assert(caseState.state_progression.eliminated_suspects.length === 0, 'no suspects eliminated initially');

  const lila = caseState.suspects.find((suspect) => suspect.suspect_id === 'lila_groove');
  assert(lila.baseline.access === 'impossible', 'Lila access should derive from why_others_could_not');
  assert(caseState.state_progression.constraints.some((entry) => entry.suspect_id === 'lila_groove'), 'baseline constraints should include blocked access');

  console.log('CASE STATE BUILDER TEST PASSED');
}

run();
