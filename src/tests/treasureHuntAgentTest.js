import assert from 'node:assert/strict';
import { treasureHuntAgent } from '../agents/treasureHuntAgent.js';

process.env.SMOKE_MODE = 'true';

const ctx = {
  playerCount: 4,
  storyBlurb: 'A gala ends in theft rumors.',
  cards: [
    { card_id: 'l1', card_type: 'location', card_title: 'The Orangery', card_contents: 'Glass and vines.' },
    { card_id: 'l2', card_type: 'location', card_title: 'North Cellar', card_contents: 'Cool storage.' },
    { card_id: 'l3', card_type: 'location', card_title: 'Library Annex', card_contents: 'Shelves.' }
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
assert.ok(clues.every((c) => !String(c.card_contents).toLowerCase().includes('false bottom')));
assert.equal(items.length, 2);
assert.ok(items.every((c) => c.hidden_until_solved === true));
const locCard = items.find((c) => c.card_contents.includes('orangery'));
assert.ok(locCard);
assert.equal(locCard.card_contents, ctx.coreTruth.treasure.hiding_place);

console.log('treasureHuntAgentTest OK');
