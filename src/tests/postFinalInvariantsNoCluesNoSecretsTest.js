import assert from 'node:assert/strict';
import { postFinalInvariantsAgent } from '../agents/postFinalInvariantsAgent.js';

const context = {
  playerCount: 2,
  cluesPerPlayer: 0,
  includeSecrets: false,
  includeHostSpeeches: false,
  cards: [
    { card_id: 'c1', card_type: 'character', card_title: 'A', card_contents: 'A character.' },
    { card_id: 'c2', card_type: 'character', card_title: 'B', card_contents: 'A character.' },
    { card_id: 'a1', card_type: 'story_act', act: 1, card_title: 'Act 1', card_contents: 'x'.repeat(60) },
    { card_id: 'a2', card_type: 'story_act', act: 2, card_title: 'Act 2', card_contents: 'x'.repeat(60) },
    { card_id: 'a3', card_type: 'story_act', act: 3, card_title: 'Act 3', card_contents: 'x'.repeat(60) },
    { card_id: 's1', card_type: 'solution', role: 'murder', reveal: 'host_reveal', hidden: true, card_title: 'Murder', card_contents: 'x'.repeat(60) },
    { card_id: 's2', card_type: 'solution', role: 'treasure', reveal: 'host_reveal', hidden: true, card_title: 'Treasure', card_contents: 'x'.repeat(60) }
  ],
  case_state: {
    suspects: [
      { suspect_id: 'sus1', name: 'A' },
      { suspect_id: 'sus2', name: 'B' }
    ]
  }
};

const result = await postFinalInvariantsAgent(context);
assert.ok(result);
console.log('postFinalInvariantsNoCluesNoSecretsTest passed');

