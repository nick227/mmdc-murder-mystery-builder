import assert from 'node:assert/strict';
import { buildStructuralPreflight } from '../utils/structuralPreflight.js';

const context = {
  cards: [
    { card_id: 'p1', card_type: 'person', card_title: 'Lord Pembroke', card_contents: 'Host.' },
    { card_id: 'c1', card_type: 'character', card_title: 'Lord Pembroke, The Patron with Shadows', card_contents: '...' },
    { card_id: 'c2', card_type: 'character', card_title: 'Lady Anne, The Keeper of Keys', card_contents: '...' },
    { card_id: 'c3', card_type: 'character', card_title: 'Master Fenton, The Rival Poet', card_contents: '...' },
    { card_id: 'c4', card_type: 'character', card_title: 'Mistress Viola, The Actress', card_contents: '...' },
    { card_id: 'e1', card_type: 'clue', card_title: 'Scarf', card_contents: 'A silk scarf matching Lord Pembroke was found near the victim.', act: 1 },
    { card_id: 'e2', card_type: 'clue', card_title: 'Scarf Repeat', card_contents: 'A silk scarf matching Lord Pembroke was found near the victim beside the body.', act: 2 },
    { card_id: 'e3', card_type: 'clue', card_title: 'Stage Note', card_contents: 'Mistress Viola performed on stage while guests watched.', act: 1 },
    { card_id: 's1', card_type: 'secret', card_title: 'Secret', card_contents: 'Lady Anne once borrowed a passage key.', linked_character_id: 'c2' }
  ],
  clue_targets: [
    { act: 1, fact: 'Mistress Viola was visibly on stage during the murder.' },
    { act: 2, fact: 'Exclusive access to the hidden alcove belonged only to Lord Pembroke.' },
    { act: 3, fact: 'Master Fenton was witnessed in the garden maze during the alarm.' },
    { act: 3, fact: 'The missing quill was hidden inside the fountain base.' }
  ],
  puzzle_bundles: [
    { bundle_id: 'puzzle_bundle_001', act: 1, solution_summary: 'Mistress Viola was visibly on stage during the murder.' },
    { bundle_id: 'puzzle_bundle_002', act: 2, solution_summary: 'Exclusive access to the hidden alcove belonged only to Lord Pembroke.' },
    { bundle_id: 'puzzle_bundle_003', act: 3, solution_summary: 'Master Fenton was witnessed in the garden maze during the alarm.' },
    { bundle_id: 'puzzle_bundle_004', act: 3, solution_summary: 'The missing quill was hidden inside the fountain base.' }
  ],
  case_state: {
    killer_id: 'lord_pembroke',
    victim_name: '',
    suspects: [
      { suspect_id: 'lord_pembroke', name: 'Lord Pembroke', title: 'Lord Pembroke, The Patron with Shadows' },
      { suspect_id: 'lady_anne', name: 'Lady Anne', title: 'Lady Anne, The Keeper of Keys' },
      { suspect_id: 'master_fenton', name: 'Master Fenton', title: 'Master Fenton, The Rival Poet' },
      { suspect_id: 'mistress_viola', name: 'Mistress Viola', title: 'Mistress Viola, The Actress' }
    ]
  }
};

const report = buildStructuralPreflight(context);

assert.equal(report.status, 'blocked');
assert(report.issues.some((issue) => issue.code === 'duplicate_character_systems'));
assert(report.issues.some((issue) => issue.code === 'missing_victim_identity'));
assert(report.issues.some((issue) => issue.code === 'early_killer_leak'));
assert(report.issues.some((issue) => issue.code === 'duplicate_evidence_weighting'));
assert(report.issues.some((issue) => issue.code === 'dead_suspect_slots'));

console.log('structuralPreflightTest passed');
