import assert from 'node:assert/strict';
import { clueAgent } from '../agents/clueAgent.js';

const fixedClues = [
  {
    card_title: 'Torn Program',
    card_contents: 'A torn theater program was found under the balcony rail.',
    clue_type: 'object',
    suspect_name: 'Lady Anne',
    clue_weight: 'low',
    act: 3,
    location_ref: 'balcony'
  },
  {
    card_title: 'Mud On The Hem',
    card_contents: 'Fresh garden mud marked the hem of a formal coat.',
    clue_type: 'forensic',
    suspect_name: 'Lord Pembroke',
    clue_weight: 'mid',
    act: 2,
    location_ref: 'maze'
  },
  {
    card_title: 'Missing Key Hook',
    card_contents: 'The study key hook was empty before the alarm was raised.',
    clue_type: 'access',
    suspect_name: 'Mistress Viola',
    clue_weight: 'high',
    act: 1,
    location_ref: 'study'
  },
  {
    card_title: 'Wax Drip',
    card_contents: 'Warm sealing wax dripped beside an unsigned note.',
    clue_type: 'forensic',
    suspect_name: 'Lady Anne',
    clue_weight: 'low',
    act: 1,
    location_ref: 'writing_desk'
  },
  {
    card_title: 'Hallway Witness',
    card_contents: 'A servant heard hurried steps in the west hallway.',
    clue_type: 'witness',
    suspect_name: 'Lord Pembroke',
    clue_weight: 'mid',
    act: 2,
    location_ref: 'west_hall'
  },
  {
    card_title: 'Ledger Tear-Out',
    card_contents: 'A page naming a private debt was torn from the ledger.',
    clue_type: 'document',
    suspect_name: 'Mistress Viola',
    clue_weight: 'high',
    act: 3,
    location_ref: 'office'
  }
];

const mockContext = {
  playerCount: 3,
  cards: [
    {
      card_id: 'char-1',
      card_type: 'character',
      card_title: 'Lady Anne, The Keeper of Keys',
      card_contents: '...'
    },
    {
      card_id: 'char-2',
      card_type: 'character',
      card_title: 'Lord Pembroke, The Patron with Shadows',
      card_contents: '...'
    },
    {
      card_id: 'char-3',
      card_type: 'character',
      card_title: 'Mistress Viola, The Actress',
      card_contents: '...'
    },
    {
      card_id: 'loc-1',
      card_type: 'location',
      card_title: 'West Hall',
      card_contents: '...'
    }
  ],
  narratives: []
};

const result = await clueAgent(structuredClone(mockContext), {
  callJsonImpl: async () => ({ cards: fixedClues })
});

const clues = result.cards.filter((card) => card.card_type === 'clue');

assert.equal(clues.length, fixedClues.length, 'clueAgent should emit the exact mocked clue count');

for (const [index, clue] of clues.entries()) {
  assert.equal(typeof clue.card_id, 'string', `clue ${index} should receive a card_id`);
  assert.ok(clue.card_title, `clue ${index} should include card_title`);
  assert.ok(clue.card_contents, `clue ${index} should include card_contents`);
  assert.ok(clue.clue_type, `clue ${index} should include clue_type`);
  assert.ok(clue.suspect_name, `clue ${index} should include suspect_name`);
  assert(['low', 'mid', 'high'].includes(clue.clue_weight), `clue ${index} should use a valid clue_weight`);
  assert.equal('act' in clue, false, `clue ${index} should not expose act`);
  assert.equal('location_ref' in clue, false, `clue ${index} should not expose location_ref`);
}

console.log('clueAgentUnitTest passed');
