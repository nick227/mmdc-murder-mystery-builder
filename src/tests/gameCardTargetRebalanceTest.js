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

function card(type, act, title, contents) {
  return { game_card_type: type, act, card_title: title, card_contents: contents };
}

{
  const roster = buildSuspectRoster(caseState);
  assert.equal(roster.length, 4);
  assert.ok(roster[0].aliases.length >= 1);
}

{
  const originals = [
    card('conversation', 1, 'Press Alice', 'You must question Alice North about the wine.'),
    card('accusation', 1, 'Accuse Alice', 'Publicly accuse Alice North in front of the group.'),
    card('alibi', 1, 'Alibi Alice', 'Challenge Alice North to explain her movements.'),
    card('trade', 2, 'Trade with Alice', 'Swap a clue with Alice North before act two ends.'),
    card('revelation', 2, 'Reveal Alice', 'Force Alice North to reveal what she overheard.'),
    card('performance', 3, 'Toast Alice', 'Give a toast that centers Alice North.'),
    card('search', 3, 'Search Alice', 'Ask to examine Alice North coat pockets.'),
    card('conversation', 3, 'Corner Alice', 'Corner Alice North near the terrace.'),
    ...Array.from({ length: 12 }, (_v, i) =>
      card('flavor', (i % 3) + 1, `Flavor ${i}`, 'Enjoy the atmosphere; no direct pressure.')
    )
  ];

  const beforeTitles = originals.map((c) => c.card_title);
  const beforeContents = originals.map((c) => c.card_contents);
  const beforeActs = originals.map((c) => c.act);
  const beforeTypes = originals.map((c) => c.game_card_type);

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
  assert.deepEqual(
    cards.map((c) => c.act),
    beforeActs
  );
  assert.deepEqual(
    cards.map((c) => c.game_card_type),
    beforeTypes
  );

  const { primaryTargetCounts, namedPrimaryTargetCardCount } = collectGameCardTargetMetrics(cards, buildSuspectRoster(caseState));
  for (const count of Object.values(primaryTargetCounts)) {
    assert.ok(count <= 2, `expected <=2 per character, got ${JSON.stringify(primaryTargetCounts)}`);
  }
  assert.ok(namedPrimaryTargetCardCount <= caseState.suspects.length * 2);
}

console.log('GAME CARD TARGET REBALANCE TEST PASSED');
