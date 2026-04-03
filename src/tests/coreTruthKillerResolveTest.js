import assert from 'node:assert/strict';
import { validateKillerPlayable } from '../utils/coreTruthChecks.js';

const context = {
  cards: [
    { card_id: 'a', card_type: 'character', card_title: 'Johnny Wave Rider Malone, Lifeguard' },
    { card_id: 'b', card_type: 'character', card_title: 'Dana Kealoha, Organizer' }
  ]
};

assert.equal(
  validateKillerPlayable({ murder: { killer: 'Johnny Wave Rider Malone' } }, context),
  null,
  'exact killer name should pass'
);

assert.ok(
  String(validateKillerPlayable({ murder: { killer: 'Johnny Malone' } }, context) || '').includes('killer_not_playable'),
  'wrong short name should fail'
);

const roleContext = {
  cards: [
    { card_id: 'x', card_type: 'character', card_title: 'Sunny Blaze - The Hippie' }
  ]
};
assert.equal(
  validateKillerPlayable({ murder: { killer: 'Sunny Blaze' } }, roleContext),
  null,
  'killer short name before " - " should match card_title'
);

console.log('coreTruthKillerResolveTest: ok');
