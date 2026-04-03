import assert from 'node:assert/strict';
import { treasureHuntAgent } from '../agents/treasureHuntAgent.js';

process.env.SMOKE_MODE = 'true';

const ctx = {
  playerCount: 4,
  storyBlurb: 'A gala ends in theft rumors.',
  cards: [
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
const items = ctx.cards.filter((c) => c.card_type === 'item' && c.is_treasure);
assert.equal(clues.length, 4);
assert.deepEqual(clues.map((c) => c.act), [1, 2, 2, 3]);
assert.ok(clues.every((c) => c.clue_type === 'treasure'));
assert.equal(items.length, 1);
assert.ok(items[0].hidden_until_solved === true);
assert.ok(String(items[0].card_contents).length > 0);

console.log('treasureHuntAgentTest OK');
