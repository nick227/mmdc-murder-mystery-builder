import { canonicalizeEvidenceCard } from '../utils/evidenceFacts.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const context = {
    case_state: {
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl', title: 'Max Vinyl – The Rival' },
        { suspect_id: 'echo_ramirez', name: 'Echo Ramirez', title: 'Echo Ramirez – The Engineer' }
      ]
    },
    cards: [
      { card_type: 'location', card_title: 'Rare Vinyl Vault' },
      { card_type: 'location', card_title: 'Backstage Storage' }
    ]
  };

  const facts = canonicalizeEvidenceCard({
    card_id: 'clue-1',
    card_ref: 'bundle_1_evidence_001',
    card_title: 'Vault Access Log',
    card_contents: 'Max Vinyl accessed the Rare Vinyl Vault at 11:54 PM. Echo Ramirez was denied access at 11:52 PM.'
  }, context);

  assert(facts.length === 2, 'should produce one fact per sentence');
  assert(facts[0].subject === 'max_vinyl', 'first fact should bind to Max');
  assert(facts[0].time === '23:54', 'time should normalize to 24-hour format');
  assert(facts[0].location === 'rare_vinyl_vault', 'location should normalize from location cards');
  assert(facts[0].statement === 'Max Vinyl accessed the Rare Vinyl Vault at 11:54 PM.', 'statement should be preserved verbatim per sentence');
  assert(facts[1].subject === 'echo_ramirez', 'second fact should bind to Echo');
  assert(facts[1].time === '23:52', 'second fact should preserve sentence-specific time');
  assert(facts[1].statement === 'Echo Ramirez was denied access at 11:52 PM.', 'second statement should be preserved verbatim');
  assert(facts[0].source_card_id === 'clue-1', 'source_card_id should be preserved');

  console.log('EVIDENCE CANONICALIZATION TEST PASSED');
}

run();
