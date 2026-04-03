import assert from 'node:assert/strict';
import { rosterIntegrityValidatorAgent } from '../agents/rosterIntegrityValidatorAgent.js';

const ctx = {
  playerCount: 2,
  storyBlurb: 'Test',
  cards: [
    { card_id: 'c1', card_type: 'character', card_title: 'Luna Silverfang', card_contents: 'x' },
    { card_id: 'x1', card_type: 'clue', card_title: 'Clue', card_contents: 'Lady Ghost Name nobody knows.' }
  ]
};

await rosterIntegrityValidatorAgent(ctx);

assert(Array.isArray(ctx.debug.warning_log), 'debug.warning_log initialized');
assert.equal(
  ctx.debug.warning_log.filter((w) => w.stage === 'roster_integrity').length,
  0,
  'roster validator no longer emits unknown_phrase warnings'
);

console.log('rosterIntegrityValidatorTest OK');
