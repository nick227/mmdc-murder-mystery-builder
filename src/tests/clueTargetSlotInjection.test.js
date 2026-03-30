import assert from 'node:assert/strict';
import { clueTargetAgent } from '../agents/clueTargetAgent.js';

const context = {
  cards: [
    { card_id: 'c1', card_type: 'clue', card_title: 'Low A', card_contents: 'Lord Pembroke was noted near Rose Arbor.', clue_type: 'location', clue_weight: 'low', suspect_name: 'Lord Pembroke' },
    { card_id: 'c2', card_type: 'clue', card_title: 'Mid A', card_contents: 'Lady Anne moved through Willow Stage shortly before the alarm.', clue_type: 'movement', clue_weight: 'mid', suspect_name: 'Lady Anne' },
    { card_id: 'c3', card_type: 'clue', card_title: 'Low B', card_contents: 'Master Fenton handled the Bard Quill near Rose Arbor.', clue_type: 'object', clue_weight: 'low', suspect_name: 'Master Fenton' },
    { card_id: 'c6', card_type: 'clue', card_title: 'Mid B', card_contents: 'Mistress Viola was seen near the Lantern Walk.', clue_type: 'location', clue_weight: 'mid', suspect_name: 'Mistress Viola' },
    { card_id: 'c4', card_type: 'clue', card_title: 'High A', card_contents: 'Lady Anne retained the master key to the study.', clue_type: 'access', clue_weight: 'high', suspect_name: 'Lady Anne' },
    { card_id: 'c5', card_type: 'clue', card_title: 'High B', card_contents: 'Lady Anne controlled the locked route to the archive.', clue_type: 'access', clue_weight: 'high', suspect_name: 'Lady Anne' }
  ],
  case_state: {
    killer_id: 'lady_anne',
    suspects: [
      { suspect_id: 'lady_anne', name: 'Lady Anne', title: 'Lady Anne' },
      { suspect_id: 'lord_pembroke', name: 'Lord Pembroke', title: 'Lord Pembroke' },
      { suspect_id: 'master_fenton', name: 'Master Fenton', title: 'Master Fenton' },
      { suspect_id: 'mistress_viola', name: 'Mistress Viola', title: 'Mistress Viola' }
    ]
  }
};

const result = await clueTargetAgent(structuredClone(context));

const killerClues = result.cards.filter((card) =>
  card.card_type === 'clue'
  && card.clue_weight === 'high'
  && card.suspect_name === 'Lady Anne'
);
assert.equal(killerClues.length, 2);

const nonKillerClues = result.cards.filter((card) =>
  card.card_type === 'clue'
  && card.clue_weight !== 'high'
  && card.suspect_name
  && card.suspect_name !== 'Lady Anne'
);
assert.equal(nonKillerClues.length, 3);
assert.equal(result.cards.filter((card) => card.card_type === 'clue' && !card.suspect_name).length, 0);
assert.equal('clue_targets' in result, false);

console.log('clueTargetSlotInjection.test passed');
