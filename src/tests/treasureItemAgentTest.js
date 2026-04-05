import assert from 'node:assert/strict';
import { treasureItemAgent } from '../agents/treasureItemAgent.js';

const ctx = {
  cards: [
    { card_id: 'i1', card_type: 'item', card_title: 'Rusty Key', card_contents: 'Old key' },
    {
      card_id: 'i2',
      card_type: 'item',
      card_title: 'The Golden Goose',
      card_contents: 'Shiny'
    }
  ],
  coreTruth: {
    treasure: {
      object: 'The Golden Goose',
      hiding_place: 'Under the floorboard',
      treasure_solution: 'Lift the loose board.'
    }
  }
};

await treasureItemAgent(ctx);
const items = ctx.cards.filter((c) => c.card_type === 'item');
assert.ok(!items.some((c) => c.is_treasure));
const clue = ctx.cards.filter((c) => c.card_type === 'clue' && c.meta?.treasure_stage === 'clue');
assert.equal(clue.length, 1);
assert.equal(clue[0].hidden_until_solved, true);
assert.equal(clue[0].role, 'treasure');
const reveal = ctx.cards.filter((c) => c.card_type === 'treasure');
assert.equal(reveal.length, 1);
assert.equal(reveal[0].card_title, 'The Golden Goose');
assert.equal(reveal[0].act, 3);
assert.equal(reveal[0].hidden_until_solved, true);
assert.equal(reveal[0].linked_item_id, 'i2');

const ctx2 = {
  cards: [{ card_id: 'x', card_type: 'item', card_title: 'Unrelated', card_contents: 'x' }],
  coreTruth: {
    treasure: {
      object: 'Only In Truth',
      hiding_place: 'Hidden chamber beneath the stage with ornate carvings.',
      treasure_solution: 'Turn the third sconce to open the panel and recover the relic.'
    }
  }
};
await treasureItemAgent(ctx2);
const tr = ctx2.cards.find((c) => c.card_type === 'treasure');
const tc = ctx2.cards.find((c) => c.card_type === 'clue' && c.meta?.treasure_stage === 'clue');
assert.ok(tr);
assert.ok(tc);
assert.ok(!tr.linked_item_id);

console.log('treasureItemAgentTest OK');
