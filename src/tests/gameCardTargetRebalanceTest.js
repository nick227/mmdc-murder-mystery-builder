import assert from 'node:assert/strict';
import {
  buildSuspectRoster,
  collectGameCardTargetMetrics,
  rebalanceGameCardTargets
} from '../utils/gameCardTargetRebalance.js';

const caseState = {
  suspects: [
    { suspect_id: 's1', name: 'Alice North', title: 'Alice North, Host' },
    { suspect_id: 's2', name: 'Ben Cruz', title: 'Ben Cruz, Chef' },
    { suspect_id: 's3', name: 'Cara Diaz', title: 'Cara Diaz, Musician' },
    { suspect_id: 's4', name: 'Dan Eli', title: 'Dan Eli, Critic' }
  ]
};

function card(title, contents) {
  return { card_title: title, card_contents: contents };
}

{
  const roster = buildSuspectRoster(caseState);
  assert.equal(roster.length, 4);
  assert.ok(roster[0].aliases.length >= 1);
}

{
  const originals = [
    card('Press Alice', 'You must question Alice North about the wine.'),
    card('Accuse Alice', 'Publicly accuse Alice North in front of the group.'),
    card('Alibi Alice', 'Challenge Alice North to explain her movements.'),
    card('Trade with Alice', 'Swap a clue with Alice North before the next break.'),
    card('Reveal Alice', 'Force Alice North to reveal what she overheard.'),
    card('Toast Alice', 'Give a toast that centers Alice North.'),
    card('Search Alice', 'Ask to examine Alice North coat pockets.'),
    card('Corner Alice', 'Corner Alice North near the terrace.'),
    ...Array.from({ length: 12 }, (_v, i) =>
      card(`Flavor ${i}`, 'Enjoy the atmosphere; no direct pressure.')
    )
  ];

  const beforeTitles = originals.map((c) => c.card_title);
  const beforeContents = originals.map((c) => c.card_contents);
  const cards = originals.map((c) => ({ ...c }));
  rebalanceGameCardTargets(cards, caseState);

  assert.deepEqual(
    cards.map((c) => c.card_title),
    beforeTitles
  );
  assert.deepEqual(
    cards.map((c) => c.card_contents),
    beforeContents
  );
  const { primaryTargetCounts, namedPrimaryTargetCardCount } = collectGameCardTargetMetrics(cards, buildSuspectRoster(caseState));
  for (const count of Object.values(primaryTargetCounts)) {
    assert.ok(count <= 2, `expected <=2 per character, got ${JSON.stringify(primaryTargetCounts)}`);
  }
  assert.ok(namedPrimaryTargetCardCount <= caseState.suspects.length * 2);
}

console.log('GAME CARD TARGET REBALANCE TEST PASSED');
