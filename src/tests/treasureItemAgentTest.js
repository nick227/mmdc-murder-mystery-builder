import assert from 'node:assert/strict';
import { treasureItemAgent } from '../agents/treasureItemAgent.js';

const ctx = {
  cards: [
    { card_id: 'i1', card_type: 'item', card_title: 'Rusty Key', card_contents: 'Old key', is_treasure: false },
    {
      card_id: 'i2',
      card_type: 'item',
      card_title: 'The Golden Goose',
      card_contents: 'Shiny',
      is_treasure: false
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
assert.equal(items.filter((c) => c.is_treasure === true).length, 1);
assert.equal(items.find((c) => c.is_treasure)?.card_title, 'The Golden Goose');

const ctx2 = {
  cards: [{ card_id: 'x', card_type: 'item', card_title: 'Unrelated', card_contents: 'x' }],
  coreTruth: {
    treasure: {
      object: 'Only In Truth',
      hiding_place: 'h',
      treasure_solution: 's'
    }
  }
};
await treasureItemAgent(ctx2);
assert.equal(ctx2.cards.filter((c) => c.card_type === 'item').length, 2);
assert.ok(ctx2.cards.some((c) => c.card_type === 'item' && c.is_treasure && c.card_title === 'Only In Truth'));

console.log('treasureItemAgentTest OK');
