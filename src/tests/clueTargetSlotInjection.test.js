import assert from 'node:assert/strict';
import { clueTargetAgent } from '../agents/clueTargetAgent.js';

const context = {
  storyBlurb: 'Shakespeare garden party murder mystery.',
  coreTruth: {
    murder: {
      victim: 'Sir Malcolm',
      location: 'Rose Arbor',
      method: 'ceremonial rope'
    },
    treasure: {
      object: 'Bard\'s Quill',
      hiding_place: 'Willow Stage'
    }
  },
  world: 'Garden party at the manor.',
  cards: [
    { card_id: 'location_1', card_type: 'location', card_title: 'Rose Arbor', card_contents: 'A quiet rose-lined alcove.' },
    { card_id: 'location_2', card_type: 'location', card_title: 'Willow Stage', card_contents: 'A small outdoor stage by the willow.' },
    { card_id: 'item_1', card_type: 'item', card_title: 'Bard\'s Quill', card_contents: 'A treasured writing quill.' },
    { card_id: 'item_2', card_type: 'item', card_title: 'Ceremonial Rope', card_contents: 'A decorative rope from the stage.' },
    { card_id: 'character_1', card_type: 'character', card_title: 'Lady Anne, The Patroness' },
    { card_id: 'character_2', card_type: 'character', card_title: 'Lord Pembroke, The Host' },
    { card_id: 'character_3', card_type: 'character', card_title: 'Master Fenton, The Actor' }
  ],
  case_state: {
    suspects: [
      { suspect_id: 'lady_anne', name: 'Lady Anne', title: 'Lady Anne' },
      { suspect_id: 'lord_pembroke', name: 'Lord Pembroke', title: 'Lord Pembroke' },
      { suspect_id: 'master_fenton', name: 'Master Fenton', title: 'Master Fenton' }
    ]
  },
  suspect_coverage: {
    required_early_suspects: ['Lady Anne', 'Lord Pembroke', 'Master Fenton']
  },
  debug: {
    warning_log: [],
    rejection_log: []
  }
};

let llmCallCount = 0;

const result = await clueTargetAgent(structuredClone(context), {
  stopAfterSlot: 2,
  isClueTargetAnchored: () => true,
  callJson: async () => {
    llmCallCount += 1;
    throw new Error('callJson should not be used for slots 1-3');
  }
});

assert.equal(llmCallCount, 0);
assert.equal(result.clue_targets.length, 2);
assert.match(result.clue_targets[0].fact, /Lady Anne/i);
assert.match(result.clue_targets[1].fact, /Lord Pembroke/i);
assert.notEqual(result.clue_targets[0].category, result.clue_targets[1].category);

console.log('clueTargetSlotInjection.test passed');
