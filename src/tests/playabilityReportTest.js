import assert from 'node:assert/strict';
import { buildPlayabilityReport } from '../utils/playabilityReport.js';
import { buildCaseState } from '../utils/caseState.js';

const context = {
  playerCount: 2,
  storyBlurb: 'Test mystery',
  coreTruth: {
    murder: {
      killer: 'Lady Viola Ravenscroft, The Enigmatic Hostess',
      victim: 'Christopher Marlowe',
      location: 'The garden',
      murder_solution:
        'Lady Viola used a scarf in the garden; legacy motive; she moved freely and lured the victim to the secluded spot.'
    },
    treasure: {
      object: 'Rose of Avon',
      hiding_place: 'Oak hollow',
      treasure_solution: 'Hidden under false bark; follow the clues.'
    }
  },
  storyEntities: {
    people: [
      { name: 'Lady Viola' },
      { name: 'Master Fenton' },
      { name: 'Christopher Marlowe' }
    ]
  },
  cards: [
    {
      card_id: 'char-1',
      card_type: 'character',
      card_title: 'Lady Viola Ravenscroft, The Enigmatic Hostess',
      card_contents: 'Hostess',
      act: 1
    },
    {
      card_id: 'char-2',
      card_type: 'character',
      card_title: 'Master Fenton Ashcombe, The Jealous Playwright',
      card_contents: 'Playwright',
      act: 1
    },
    {
      card_id: 'clue-1',
      card_type: 'clue',
      card_title: 'Early Report',
      card_contents: 'The murder was reported shortly after 8:00 PM.',
      act: 1
    },
    {
      card_id: 'clue-2',
      card_type: 'clue',
      card_title: 'Later Report',
      card_contents: 'The murder was reported at 9:15 PM beneath the oak.',
      act: 2
    }
  ],
  debug: {
    warning_log: [
      {
        stage: 'roster_integrity',
        reason: 'unknown_capitalized_phrases',
        unknown_phrases: ['Lady Marigold']
      }
    ]
  }
};

const caseState = buildCaseState(context);
assert.equal(caseState.victim_name, 'Christopher Marlowe', 'explicit coreTruth victim should be used');

const report = buildPlayabilityReport({
  ...context,
  case_state: caseState
});

assert.equal(report.status, 'blocked');
assert(report.issues.some((issue) => issue.code === 'missing_solvability_validation'));
assert(report.issues.some((issue) => issue.code === 'timeline_murder_time_conflict'));
assert(report.issues.some((issue) => issue.code === 'unknown_roster_entities'));

const noisyRosterReport = buildPlayabilityReport({
  ...context,
  debug: {
    warning_log: [
      {
        stage: 'roster_integrity',
        reason: 'unknown_capitalized_phrases',
        unknown_phrases: ['Only Lord Pembroke', 'Costume Correlation']
      }
    ]
  },
  solvability_validation: { pass: true, problems: [] },
  case_state: { killer_name: 'Lady Viola Ravenscroft', victim_name: 'Ben Jonson' },
  cards: context.cards.filter((card) => card.card_type !== 'clue')
});

assert.equal(noisyRosterReport.status, 'ready_for_playtest');
assert(noisyRosterReport.issues.some((issue) => issue.code === 'roster_validator_noise'));
assert(!noisyRosterReport.issues.some((issue) => issue.code === 'unknown_roster_entities'));

const balanceReport = buildPlayabilityReport({
  storyBlurb: 'Balanced mystery',
  solvability_validation: { pass: true, problems: [] },
  narrative_validation: { pass: true, problems: [] },
  case_state: {
    killer_name: 'Master Fenton',
    victim_name: 'Christopher Marlowe',
    suspects: [
      { name: 'William Shakespeare' },
      { name: 'Lady Viola' },
      { name: 'Master Fenton' },
      { name: 'Mistress Elinor' }
    ]
  },
  clue_targets: [
    { fact: 'William Shakespeare was on stage during the theft.' },
    { fact: 'Lady Viola was seen in the hedge maze at the same time.' },
    { fact: 'Master Fenton had access to the prop cellar and was carrying the rope shortly before the murder.' },
    { fact: 'The rope bore Master Fenton fingerprints, confirming the same access path.' }
  ],
  cards: [
    { card_type: 'clue', card_title: 'Rope Log', card_contents: 'Master Fenton checked out the rope from storage.' },
    { card_type: 'clue', card_title: 'Fingerprint Report', card_contents: 'Master Fenton fingerprints were found on the rope.' },
    { card_type: 'clue', card_title: 'Presence Statement', card_contents: 'Master Fenton was present in the alcove during the murder.' },
    { card_type: 'item', card_title: 'Hidden Rope', card_contents: 'A rope tied to Master Fenton was found hidden in his room.' }
  ]
});

assert(balanceReport.issues.some((issue) => issue.code === 'final_bundle_redundant_confirmation'));
assert(balanceReport.issues.some((issue) => issue.code === 'suspect_evidence_overweight'));

console.log('playabilityReportTest passed');
