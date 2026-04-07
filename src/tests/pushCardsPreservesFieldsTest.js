import assert from 'node:assert/strict';
import { pushCards } from '../utils/cards.js';

const context = { cards: [] };

pushCards(context, 'character', [{
  card_title: 'Test Character',
  card_contents: 'A mysterious figure.',
  image_url: 'https://cdn.example.com/images/abc.png'
}]);

assert.equal(context.cards.length, 1);
assert.equal(context.cards[0].card_type, 'character');
assert.equal(context.cards[0].image_url, 'https://cdn.example.com/images/abc.png');

console.log('pushCardsPreservesFieldsTest passed');

