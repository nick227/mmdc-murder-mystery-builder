/* global structuredClone */
import assert from 'node:assert/strict';
import { clueTargetAgent } from '../agents/clueTargetAgent.js';

const context = {
  cards: [
    { card_id: 'c1', card_type: 'clue', card_title: 'Low A', card_contents: 'Lord Pembroke was noted near Rose Arbor.', role: 'evidence', weight: 'low', target_id: 'lord_pembroke' },
    { card_id: 'c2', card_type: 'clue', card_title: 'Mid A', card_contents: 'Lady Anne moved through Willow Stage shortly before the alarm.', role: 'alibi', weight: 'mid', target_id: 'lady_anne' },
    { card_id: 'c3', card_type: 'clue', card_title: 'Low B', card_contents: 'Master Fenton handled the Bard Quill near Rose Arbor.', role: 'evidence', weight: 'low', target_id: 'master_fenton' },
    { card_id: 'c6', card_type: 'clue', card_title: 'Mid B', card_contents: 'Mistress Viola was seen near the Lantern Walk.', role: 'evidence', weight: 'mid', target_id: 'mistress_viola' },
    { card_id: 'c4', card_type: 'clue', card_title: 'High A', card_contents: 'Lady Anne retained the master key to the study.', role: 'suspect_pressure', weight: 'high', target_id: 'lady_anne' },
    { card_id: 'c5', card_type: 'clue', card_title: 'High B', card_contents: 'Lady Anne controlled the locked route to the archive.', role: 'suspect_pressure', weight: 'high', target_id: 'lady_anne' }
  ],
  case_state: {
    killer_id: 'lady_anne',
    suspects: [
      { suspect_id: 'lady_anne', name: 'Lady Anne', title: 'Lady Anne' },
      { suspect_id: 'lord_pembroke', name: 'Lord Pembroke', title: 'Lord Pembroke' },
      { suspect_id: 'master_fenton', name: 'Master Fenton', title: 'Master Fenton' },
      { suspect_id: 'mistress_viola', name: 'Mistress Viola', title: 'Mistress Viola' }
    ]
  },
  coreTruth: {
    murder: {
      victim: 'The Victim',
      location: 'Rose Arbor'
    },
    treasure: {
      object: 'Jeweled Compass',
      hiding_place: 'behind the stage panel'
    }
  }
};

const result = await clueTargetAgent(structuredClone(context));

const killerClues = result.cards.filter((card) =>
  card.card_type === 'clue'
  && card.weight === 'high'
  && card.target_id === 'lady_anne'
);
assert.equal(killerClues.length, 2);

const nonKillerClues = result.cards.filter((card) =>
  card.card_type === 'clue'
  && card.weight !== 'high'
  && card.target_id
  && card.target_id !== 'lady_anne'
);
assert.equal(nonKillerClues.length, 3);
assert.equal(result.cards.filter((card) => card.card_type === 'clue' && !('target_id' in card)).length, 0);
assert.ok(Array.isArray(result.clue_targets));
assert.equal(result.clue_targets.length, 4);
assert.match(result.clue_targets[0].fact, /Lord Pembroke|Lady Anne|Master Fenton|Mistress Viola/i);
assert.match(result.clue_targets[1].fact, /Rose Arbor/i);
assert.match(result.clue_targets[2].fact, /Jeweled Compass/i);
assert.match(result.clue_targets[3].fact, /behind the stage panel/i);
for (const entry of result.clue_targets) {
  assert.ok(entry.target_id);
  assert.ok(entry.fact);
  assert.ok(entry.puzzle_type_hint);
}

console.log('clueTargetSlotInjection.test passed');
