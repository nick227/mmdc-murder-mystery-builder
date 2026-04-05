import assert from 'node:assert/strict';
import { buildCardSurface } from '../utils/cardSurface.js';

const surface = buildCardSurface({
  cards: [
    { card_type: 'solution', role: 'murder', reveal: 'host_reveal' },
    { card_type: 'solution', role: 'treasure', reveal: 'host_reveal' },
    { card_type: 'clue' },
    { card_type: 'secret' },
    { card_type: 'item' }
  ]
});

assert.equal(surface.solution_reveal_count, 2);
assert.equal(surface.solution_roles.murder, 1);
assert.equal(surface.solution_roles.treasure, 1);
assert.equal(surface.counts_by_card_type.clue, 1);
assert.equal(surface.counts_by_card_type.secret, 1);

console.log('cardSurfaceTest passed');
