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

assert.equal(
  validateKillerPlayable({ murder: { killer: 'Johnny Malone' } }, context),
  'killer_not_playable: killer must match a playable character name exactly'
);

console.log('coreTruthKillerResolveTest: ok');
