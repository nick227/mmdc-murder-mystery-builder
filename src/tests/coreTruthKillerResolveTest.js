import assert from 'node:assert/strict';
import { resolveKillerToPlayableName } from '../utils/coreTruthChecks.js';

const playable = [
  { name: 'Johnny \'Wave Rider\' Malone', card_id: 'a', title: '', contents: '' },
  { name: 'Dana Kealoha', card_id: 'b', title: '', contents: '' }
];

assert.equal(
  resolveKillerToPlayableName('Johnny Malone', playable),
  'Johnny \'Wave Rider\' Malone',
  'shortened killer should map to playable card base name'
);

assert.equal(resolveKillerToPlayableName('Johnny \'Wave Rider\' Malone', playable), 'Johnny \'Wave Rider\' Malone');

assert.equal(resolveKillerToPlayableName('Unknown NPC', playable), null);

console.log('coreTruthKillerResolveTest: ok');
