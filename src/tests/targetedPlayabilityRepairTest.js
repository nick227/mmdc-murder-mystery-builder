import assert from 'node:assert/strict';
import { buildPlayabilityReport } from '../utils/playabilityReport.js';

const context = {
  cards: [
    {
      card_id: 'char-1',
      card_type: 'character',
      card_title: 'Lady Viola Ravenscroft, The Enigmatic Hostess',
      card_contents: 'Hostess',
      act: 1
    },
    {
      card_id: 'loc-1',
      card_type: 'location',
      card_title: 'The Willow Glade',
      card_contents: 'Glade',
      act: 1
    },
    {
      card_id: 'clue-1',
      card_type: 'clue',
      card_title: 'Bad Card',
      card_contents: 'Lady Marigold saw the murder reported shortly after 8:00 PM. The murder was reported at 9:15 PM.',
      act: 1
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

const report = buildPlayabilityReport(context);
const issueCodes = report.issues.map((issue) => issue.code);

assert(issueCodes.includes('timeline_murder_time_conflict'));
assert(issueCodes.includes('unknown_roster_entities'));

console.log('targetedPlayabilityRepairTest passed');
