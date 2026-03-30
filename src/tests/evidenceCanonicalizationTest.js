import { buildEvidenceSignature, canonicalizeEvidenceCard } from '../utils/evidenceFacts.js';

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

  const signatureContext = {
    case_state: {
      suspects: [
        { suspect_id: 'master_quillan', name: 'Master Quillan', title: 'Master Quillan, The Keeper of Secrets' }
      ]
    },
    cards: []
  };

  const sonnetSignature = buildEvidenceSignature({
    card_title: 'Cryptic Sonnet',
    card_contents: 'A mysterious poem found in the victim hand, believed to hold clues to the Folio whereabouts.'
  }, signatureContext);
  assert(sonnetSignature === 'scene|sonnet|plain|unknown_location', 'sonnet title should win over folio mention in contents');

  const quillCaseSignature = buildEvidenceSignature({
    card_title: 'The Coded Quill Case',
    card_contents: 'A finely crafted leather case designed to hold the poisoned quill and other writing instruments.'
  }, signatureContext);
  assert(quillCaseSignature === 'scene|quill case|plain|unknown_location', 'quill case should stay distinct from quill');

  const quillAndParchmentSignature = buildEvidenceSignature({
    card_title: 'Quill and Parchment',
    card_contents: 'A set of writing tools found near the crime scene, possibly holding cryptic messages or clues.'
  }, signatureContext);
  assert(quillAndParchmentSignature === 'scene|quill and parchment|plain|unknown_location', 'compound item titles should stay distinct from a plain quill');

  const quillanSignature = buildEvidenceSignature({
    card_title: 'Last Seen with Lord Arden Alive',
    card_contents: 'Master Quillan was the last person seen with Lord Arden alive, though his timeline contains inconsistencies.'
  }, signatureContext);
  assert(quillanSignature === 'master_quillan|last_seen_with|plain|unknown_location', 'suspect names should not trigger quill object matching by substring');

  const exactQuillNameSignature = buildEvidenceSignature({
    card_title: 'Hidden Correspondence With Victim',
    card_contents: 'A series of secret letters between Master Prospero Quill and the victim were uncovered, hinting at a deeper connection than publicly known.'
  }, {
    case_state: {
      suspects: [
        { suspect_id: 'master_prospero_quill', name: 'Master Prospero Quill', title: 'Master Prospero Quill, The Scholarly Librarian' }
      ]
    },
    cards: []
  });
  assert(exactQuillNameSignature === 'master_prospero_quill|hidden_correspondence_with|hidden|unknown_location', 'exact surname matches should not collapse to quill objects');

  console.log('EVIDENCE CANONICALIZATION TEST PASSED');
}

run();
