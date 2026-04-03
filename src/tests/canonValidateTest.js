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

assertMurderClueSuspectNames({
  coreTruth,
  case_state: {
    suspects: [
      { name: 'Alex North' },
      { name: 'Sam Lee' }
    ]
  },
  cards: [
    {
      card_type: 'clue',
      clue_type: 'fact',
      card_title: 'A',
      suspect_name: 'Alex North',
      card_id: '1'
    },
    {
      card_type: 'clue',
      clue_type: 'artifact',
      card_title: 'B',
      suspect_name: 'Sam Lee',
      card_id: '2'
    },
    {
      card_type: 'clue',
      clue_type: 'fact',
      card_title: 'Victim clue',
      suspect_name: 'Pat Jordan',
      card_id: '3'
    }
  ]
});

expectThrow(
  () =>
    assertMurderClueSuspectNames({
      coreTruth,
      case_state: { suspects: [{ name: 'Alex North' }] },
      cards: [
        {
          card_type: 'clue',
          clue_type: 'fact',
          card_title: 'X',
          suspect_name: 'Nobody Known',
          card_id: '1'
        }
      ]
    }),
  'roster'
);

assertPuzzleDraftsMurderCanon({
  coreTruth,
  puzzle_bundle_drafts: [
    {
      cards: [
        { card_type: 'evidence', card_title: 'E', card_contents: 'Pat Jordan at North Hall' },
        { card_type: 'puzzle', card_title: 'P', card_contents: 'Pat Jordan North Hall?' },
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
            { card_type: 'evidence', card_contents: 'Pat Jordan only' },
            { card_type: 'puzzle', card_contents: 'missing location' }
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
      card_contents: 'Pat Jordan scene'
    },
    {
      bundle_id: 'b1',
      card_type: 'puzzle',
      card_title: 'p',
      card_contents: 'North Hall map'
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
          card_contents: 'Pat Jordan only'
        },
        {
          bundle_id: 'b2',
          card_type: 'puzzle',
          card_contents: 'no location'
        }
      ]
    }),
  'location'
);

console.log('canonValidateTest passed');
