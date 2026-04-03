import assert from 'node:assert/strict';
import { buildCardSurface } from '../utils/cardSurface.js';

const surface = buildCardSurface({
  cards: [
    { card_type: 'clue', clue_type: 'treasure' },
    { card_type: 'clue', clue_type: 'fact' },
    { card_type: 'secret' }
  ]
});

assert.equal(surface.treasure_clue_count, 1);
assert.equal(surface.counts_by_card_type.clue, 2);
assert.equal(surface.counts_by_card_type.secret, 1);
assert.equal(surface.optional_card_types_not_in_default_pipeline.secret, 1);
assert.equal(surface.optional_card_types_not_in_default_pipeline.host_speech, 0);

console.log('cardSurfaceTest passed');
