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
        murder_solution:
          'Max Vinyl strangled DJ Spinmaster in the Rare Vinyl Vault with a guitar cable to steal the Lost Melody; he slipped away during the party.'
      },
      treasure: {
        object: 'Lost Melody',
        hiding_place: 'climate control panel',
        treasure_solution: 'Ledger proves estate control; players follow the climate control access trail.'
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
  assert(lila.baseline.access === 'unknown', 'without exclusion lines access stays unknown');
  assert(caseState.state_progression.constraints.length === 0, 'no baseline constraints without exclusion text');

  console.log('CASE STATE BUILDER TEST PASSED');
}

run();
