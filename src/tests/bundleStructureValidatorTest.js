import { bundleStructureValidatorAgent } from '../agents/bundleStructureValidatorAgent.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFailure(fn, pattern) {
  try {
    await fn();
  } catch (error) {
    if (pattern.test(String(error.message || ''))) {
      return;
    }
    throw error;
  }

  throw new Error(`Expected failure matching ${pattern}`);
}

function makeContext() {
  return {
    coreTruth: {
      murder: {
        killer: 'Max Vinyl',
        victim: 'Pat Chen',
        location: 'Rare Vinyl Vault',
        murder_solution: 'Max Vinyl struck the victim after hours.'
      },
      treasure: {
        object: 'Demo reliquary',
        hiding_place: 'under the riser',
        treasure_solution: 'Lift the riser plate.'
      }
    },
    case_state: {
      killer_id: 'max_vinyl',
      suspects: [
        { suspect_id: 'max_vinyl', name: 'Max Vinyl' },
        { suspect_id: 'lila_groove', name: 'Lila Groove' }
      ]
    },
    puzzle_bundles: [
      {
        bundle_id: 'puzzle_bundle_001',
        act: 1,
        puzzle_type: 'timeline',
        clue_target: 'Max accessed the vault at 11:54 PM.'
      }
    ],
    cards: [
      {
        card_id: 'e1',
        card_type: 'clue',
        card_title: 'Access Log',
        card_contents: 'The vault log shows Max entering at 11:54 PM.',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false
      },
      {
        card_id: 'e2',
        card_type: 'clue',
        card_title: 'Door Camera Transcript',
        card_contents: 'The camera transcript notes no one else entered the corridor at 11:54 PM.',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false
      },
      {
        card_id: 'g1',
        card_type: 'item',
        card_title: 'Door Camera Note',
        card_contents: 'The vault corridor was clear when the lock engaged.',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false
      },
      {
        card_id: 's1',
        card_type: 'solution',
        card_title: 'Vault Access',
        card_contents: 'Max accessed the vault at 11:54 PM.',
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: true
      },
      {
        card_id: 'p1',
        card_type: 'puzzle',
        card_title: 'Vault Puzzle',
        card_contents: 'Compare the access records and camera note.',
        puzzle_type: 'timeline',
        unlock_card_ids: ['s1'],
        bundle_id: 'puzzle_bundle_001',
        hidden_until_solved: false,
        act: 1
      }
    ]
  };
}

async function run() {
  await bundleStructureValidatorAgent(makeContext());

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      cards: makeContext().cards.map((card) => card.card_id === 's1'
        ? { ...card, hidden_until_solved: false }
        : card)
    }),
    /solution must remain hidden/
  );

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      cards: makeContext().cards.map((card) => card.card_id === 'p1'
        ? { ...card, hidden_until_solved: true }
        : card)
    }),
    /puzzle must remain visible/
  );

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      cards: makeContext().cards.map((card) => card.card_id === 'e1'
        ? { ...card, hidden_until_solved: true }
        : card)
    }),
    /evidence must remain visible/
  );

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      cards: makeContext().cards.map((card) => card.card_id === 's1'
        ? { ...card, card_contents: '   ' }
        : card)
    }),
    /solution must have card_contents/
  );

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      cards: makeContext().cards.map((card) => card.card_id === 'p1'
        ? { ...card, card_contents: 'Compare the access records. Max accessed the vault at 11:54 PM.' }
        : card)
    }),
    /puzzle leaks its hidden solution/
  );

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      cards: makeContext().cards.map((card) => card.card_id === 's1'
        ? { ...card, card_contents: 'Only the available evidence fits.' }
        : card),
      puzzle_bundles: [
        {
          bundle_id: 'puzzle_bundle_001',
          act: 1,
          puzzle_type: 'timeline',
          clue_target: 'Only the available evidence fits.'
        }
      ]
    }),
    /solution must reference suspect or location or object/
  );

  await expectFailure(
    () => bundleStructureValidatorAgent({
      ...makeContext(),
      puzzle_bundles: [
        {
          bundle_id: 'puzzle_bundle_001',
          act: 2,
          puzzle_type: 'timeline',
          clue_target: 'Max accessed the vault at 11:54 PM.'
        }
      ]
    }),
    /act metadata drift/
  );

  const tooFewEvidence = makeContext();
  tooFewEvidence.cards = tooFewEvidence.cards.filter((card) => card.card_id !== 'e2' && card.card_id !== 'g1');
  await expectFailure(
    () => bundleStructureValidatorAgent(tooFewEvidence),
    /at least 2 evidence cards/
  );

  const missingGate = makeContext();
  missingGate.cards = missingGate.cards.filter((card) => card.card_id !== 'g1');
  await expectFailure(
    () => bundleStructureValidatorAgent(missingGate),
    /at least 1 gate card/
  );

  assert(true, 'bundle structure validator tests should complete');
  console.log('BUNDLE STRUCTURE VALIDATOR TEST PASSED');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
