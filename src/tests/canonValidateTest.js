import assert from 'node:assert/strict';
import {
  assertBundleVisibleMurderCanon,
  assertMurderClueSuspectNames,
  assertPuzzleDraftsMurderCanon
} from '../utils/canonValidate.js';

function expectThrow(fn, msg) {
  assert.throws(fn, (err) => typeof err.message === 'string' && err.message.includes(msg));
}

const coreTruth = {
  murder: {
    killer: 'Alex North',
    victim: 'Pat Jordan',
    location: 'North Hall',
    murder_solution: 'Alex struck Pat in North Hall.'
  },
  treasure: { object: 'x', hiding_place: 'y', treasure_solution: 'z' }
};

const rosterContext = {
  coreTruth,
  case_state: {
    suspects: [
      { suspect_id: 'alex_north', name: 'Alex North', title: 'Alex North' },
      { suspect_id: 'sam_lee', name: 'Sam Lee', title: 'Sam Lee' }
    ]
  },
  cards: [
    {
      card_type: 'clue',
      role: 'evidence',
      card_title: 'A',
      target_id: 'alex_north',
      weight: 'mid',
      card_id: '1'
    },
    {
      card_type: 'clue',
      role: 'suspect_pressure',
      card_title: 'B',
      target_id: 'sam_lee',
      weight: 'high',
      card_id: '2'
    },
    {
      card_type: 'clue',
      role: 'alibi',
      card_title: 'Victim clue',
      target_id: null,
      weight: 'low',
      card_id: '3'
    }
  ],
  debug: { warning_log: [] }
};

assertMurderClueSuspectNames(rosterContext);
assert.ok(rosterContext.debug.warning_log.length >= 1, 'expected warnings for null/empty target_id');

const offRosterContext = {
  coreTruth,
  case_state: { suspects: [{ suspect_id: 'alex_north', name: 'Alex North', title: 'Alex North' }] },
  cards: [
    {
      card_type: 'clue',
      role: 'evidence',
      card_title: 'X',
      target_id: 'nobody_known',
      weight: 'mid',
      card_id: '1'
    }
  ],
  debug: { warning_log: [] }
};
assertMurderClueSuspectNames(offRosterContext);
assert.ok(offRosterContext.debug.warning_log.some((w) => w.reason === 'off_roster_target_id'));

assertPuzzleDraftsMurderCanon({
  coreTruth,
  puzzle_bundle_drafts: [
    {
      cards: [
        { card_type: 'evidence', card_title: 'E', card_contents: 'Pat Jordan at North Hall', murder_canon: { victim: 'Pat Jordan', location: 'North Hall' } },
        { card_type: 'puzzle', card_title: 'P', card_contents: 'Pat Jordan North Hall?', murder_canon: { victim: 'Pat Jordan', location: 'North Hall' } },
        { card_type: 'solution', card_title: 'S', card_contents: 'other' }
      ]
    }
  ]
});

expectThrow(
  () =>
    assertPuzzleDraftsMurderCanon({
      coreTruth,
      puzzle_bundle_drafts: [
        {
          cards: [
            { card_type: 'evidence', card_contents: 'Pat Jordan only', murder_canon: { victim: 'Pat Jordan', location: '' } },
            { card_type: 'puzzle', card_contents: 'missing location', murder_canon: { victim: 'Pat Jordan', location: '' } }
          ]
        }
      ]
    }),
  'location'
);

assertBundleVisibleMurderCanon({
  coreTruth,
  cards: [
    {
      bundle_id: 'b1',
      card_type: 'clue',
      hidden_until_solved: false,
      card_title: 'v',
      card_contents: 'Pat Jordan scene',
      murder_canon: { victim: 'Pat Jordan', location: 'North Hall' }
    },
    {
      bundle_id: 'b1',
      card_type: 'puzzle',
      card_title: 'p',
      card_contents: 'North Hall map',
      murder_canon: { victim: 'Pat Jordan', location: 'North Hall' }
    },
    {
      bundle_id: 'b1',
      card_type: 'solution',
      hidden_until_solved: true,
      card_contents: 'ignored for visible check'
    }
  ]
});

expectThrow(
  () =>
    assertBundleVisibleMurderCanon({
      coreTruth,
      cards: [
        {
          bundle_id: 'b2',
          card_type: 'clue',
          hidden_until_solved: false,
          card_contents: 'Pat Jordan only',
          murder_canon: { victim: 'Pat Jordan', location: '' }
        },
        {
          bundle_id: 'b2',
          card_type: 'puzzle',
          card_contents: 'no location',
          murder_canon: { victim: 'Pat Jordan', location: '' }
        }
      ]
    }),
  'murder_canon'
);

console.log('canonValidateTest passed');
