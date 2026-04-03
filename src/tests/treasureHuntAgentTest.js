import assert from 'node:assert/strict';
import { treasureHuntAgent } from '../agents/treasureHuntAgent.js';

process.env.SMOKE_MODE = 'true';

const ctx = {
  playerCount: 3,
  storyBlurb: 'A gala ends in theft rumors.',
  cards: [
    { card_id: 'ch1', card_type: 'character', card_title: 'Alpha One, The First', card_contents: '...' },
    { card_id: 'ch2', card_type: 'character', card_title: 'Beta Two, The Second', card_contents: '...' },
    { card_id: 'ch3', card_type: 'character', card_title: 'Gamma Three, The Third', card_contents: '...' },
    { card_id: 'l1', card_type: 'location', card_title: 'The Orangery', card_contents: 'Glass and vines.' }
  ],
  coreTruth: {
    murder: {
      killer: 'x',
      victim: 'y',
      location: 'z',
      murder_solution: 'The crime summary for smoke.'
    },
    treasure: {
      object: 'The Silver Astrolabe',
      hiding_place: 'Inside the false bottom of the orangery humidor cabinet',
      treasure_solution: 'Wrapped in velvet; proves lineage. Follow drafts.'
    }
  },
  debug: { warning_log: [] }
};

await treasureHuntAgent(ctx);

const clues = ctx.cards.filter((c) => c.card_type === 'clue');
const treasureItems = ctx.cards.filter((c) => c.card_type === 'item' && c.is_treasure);
assert.equal(clues.length, 3);
assert.equal(treasureItems.length, 0, 'treasure identity is upstream in coreTruth; agent emits clues only');
assert.ok(clues.every((c) => c.clue_type === 'treasure'));
assert.deepEqual(
  clues.map((c) => c.act),
  [1, 2, 3],
  'act from pushCards default when omitted'
);
assert.ok(clues.every((c) => c.linked_character));
assert.ok(clues.every((c) => c.suspect_name === undefined));
assert.deepEqual(
  clues.map((c) => c.linked_character),
  ['Alpha One, The First', 'Beta Two, The Second', 'Gamma Three, The Third']
);

console.log('treasureHuntAgentTest OK');
