/* global structuredClone */
import assert from 'node:assert/strict';
import { clueAgent } from '../agents/clueAgent.js';

const fixedBriefs = [
  {
    item_name: 'Heated Argument',
    target_name: 'Dr. Hale',
    strength: 'high',
    uniqueness_angle: 'overheard voices in a corridor',
    description_seed: 'argument before the murder'
  },
  {
    item_name: 'Late Arrival',
    target_name: 'Clara Whitmore',
    strength: 'mid',
    uniqueness_angle: 'arrival time mismatch',
    description_seed: 'arrived after others gathered'
  }
];

const fixedProse = [
  { card_contents: 'The doctor was overheard arguing with the victim earlier.' },
  { card_contents: 'The heiress arrived after everyone else had gathered.' }
];

const mockContext = {
  playerCount: 2,
  case_state: {
    suspects: [
      { suspect_id: 'dr_hale', name: 'Dr. Hale' },
      { suspect_id: 'clara_whitmore', name: 'Clara Whitmore' }
    ]
  },
  cards: [
    {
      card_id: 'char-1',
      card_type: 'character',
      card_title: 'Dr. Hale, The Physician',
      card_contents: '...'
    },
    {
      card_id: 'char-2',
      card_type: 'character',
      card_title: 'Clara Whitmore, The Heiress',
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

const seenSchemas = [];
const result = await clueAgent(structuredClone(mockContext), {
  cluesPerPlayer: 1,
  callJsonImpl: async ({ schemaName, schema }) => {
    seenSchemas.push(schemaName);
    if (schemaName === 'clue_briefs') {
      assert.equal(schema?.properties?.briefs?.maxItems ?? null, 2);
      return { briefs: fixedBriefs };
    }
    if (schemaName === 'clue_prose') {
      assert.equal(schema?.properties?.cards?.maxItems ?? null, 2);
      return { cards: fixedProse };
    }
    throw new Error(`Unexpected schemaName ${schemaName}`);
  }
});

const clues = result.cards.filter((card) => card.card_type === 'clue');

assert.deepEqual(seenSchemas, ['clue_briefs', 'clue_prose']);
assert.equal(clues.length, 2, 'clueAgent should emit the exact mocked clue count');

for (const [index, clue] of clues.entries()) {
  assert.equal(typeof clue.card_id, 'string', `clue ${index} should receive a card_id`);
  assert.equal(clue.card_title, fixedBriefs[index].item_name, `clue ${index} title should use item_name`);
  assert.equal(clue.card_contents, fixedProse[index].card_contents, `clue ${index} should use prose contents`);
  assert.equal(clue.target_name, fixedBriefs[index].target_name, `clue ${index} should include target_name`);
  assert.ok(clue.target_id, `clue ${index} should resolve target_id`);
  assert.equal(clue.weight, fixedBriefs[index].strength, `clue ${index} should use strength as weight`);
  assert.equal(clue.bundle_id, null, `clue ${index} should default bundle_id to null`);
  assert.equal(clue.evidence_type, null, `clue ${index} should default evidence_type to null`);
  assert.equal('act' in clue, false, `clue ${index} should not expose act`);
  assert.equal('location_ref' in clue, false, `clue ${index} should not expose location_ref`);
}

console.log('clueAgentUnitTest passed');
