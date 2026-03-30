import { buildGameCardsPrompt } from '../prompts/gameCardsPrompt.js';
import { actedCardSchema } from '../schemas/cardsSchema.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeCaseState() {
  return {
    killer_name: 'Janet Vale',
    suspects: [
      { suspect_id: 'janet_vale', card_id: 'char-1', name: 'Janet Vale', title: 'Janet Vale, The Club Manager', is_killer: true },
      { suspect_id: 'marco_flint', card_id: 'char-2', name: 'Marco Flint', title: 'Marco Flint, The Bartender', is_killer: false },
      { suspect_id: 'sylvia_dunn', card_id: 'char-3', name: 'Sylvia Dunn', title: 'Sylvia Dunn, The Singer', is_killer: false },
      { suspect_id: 'owen_pike', card_id: 'char-4', name: 'Owen Pike', title: 'Owen Pike, The Promoter', is_killer: false }
    ]
  };
}

function makeSecrets() {
  return [
    {
      card_type: 'secret',
      linked_character_id: 'char-1',
      card_title: 'Janet Secret',
      card_contents: 'Janet hid the bar ledger after the fight.'
    },
    {
      card_type: 'secret',
      linked_character_id: 'char-2',
      card_title: 'Marco Secret',
      card_contents: 'Marco saw someone leave through the kitchen door after midnight.'
    }
  ];
}

async function run() {
  {
    const prompt = buildGameCardsPrompt({
      storyBlurb: 'A nightclub murder unfolds over three acts.',
      playerCount: 4,
      narratives: {
        a: { suspect: 'Janet Vale' },
        b: { suspect: 'Marco Flint' },
        c: { suspect: 'Sylvia Dunn' }
      },
      caseState: makeCaseState(),
      secretCards: makeSecrets()
    });

    assert(prompt.user.includes('Write exactly 20 game cards.'), 'prompt should use exact five-cards-per-player count');
    assert(prompt.user.includes('Janet Vale'), 'prompt should include suspect and killer names');
    assert(prompt.user.includes('Marco Flint'), 'prompt should include full cast names');
    assert(prompt.user.includes('- Janet Vale: The Club Manager'), 'prompt should summarize cast compactly');
    assert(prompt.user.includes('Janet hid the bar ledger after the fight.'), 'prompt should include secret card contents');
    assert(prompt.user.includes('- Janet Vale: Janet hid the bar ledger after the fight.'), 'prompt should map secrets back to character names');
    assert(!prompt.user.includes('Breadcrumbs:'), 'prompt should not include trails');
    assert(!prompt.user.includes('"suspect_id"'), 'prompt should avoid raw cast JSON dumps');
    assert(prompt.user.includes('Act 1: 40% of cards.'), 'prompt should include act 1 pacing guidance');
    assert(prompt.user.includes('Act 2: 20% of cards.'), 'prompt should include act 2 pacing guidance');
    assert(prompt.user.includes('Act 3: 40% of cards.'), 'prompt should include act 3 pacing guidance');
    assert(prompt.user.includes('performance'), 'prompt should enumerate performance card type');
    assert(prompt.user.includes('revelation'), 'prompt should enumerate revelation card type');
    assert(prompt.user.includes('No repeated premise.'), 'prompt should include anti-duplication guidance');
    assert(prompt.user.includes('Quality priorities:'), 'prompt should include story-quality guidance');
    assert(prompt.user.includes('Do not force every card to carry a major clue.'), 'prompt should leave room for lighter social cards');
  }

  {
    assert(actedCardSchema.required.includes('game_card_type'), 'acted card schema should require game_card_type');
    assert(!actedCardSchema.required.includes('location_ref'), 'acted card schema should not require location_ref');
    assert(!('location_ref' in actedCardSchema.properties), 'acted card schema should not expose location_ref');
    assert(Array.isArray(actedCardSchema.properties.game_card_type.enum), 'acted card schema should define game card type enum');
    assert(actedCardSchema.properties.game_card_type.enum.length === 8, 'acted card schema should support all eight game card types');
  }

  {
    process.env.SMOKE_MODE = 'true';
    const { gameCardAgent } = await import('../agents/gameCardAgent.js');
    const context = {
      playerCount: 4,
      storyBlurb: 'A nightclub murder unfolds over three acts.',
      narratives: {
        a: { suspect: 'Janet Vale' },
        b: { suspect: 'Marco Flint' },
        c: { suspect: 'Sylvia Dunn' }
      },
      case_state: makeCaseState(),
      cards: makeSecrets()
    };

    const result = await gameCardAgent(context);
    const gameCards = result.cards.filter((card) => card.card_type === 'game_card');

    assert(gameCards.length === 20, 'game card agent should generate exactly five cards per player');
    assert(gameCards.every((card) => card.game_card_type === 'performance' || card.game_card_type === 'conversation' || card.game_card_type === 'search' || card.game_card_type === 'flavor' || card.game_card_type === 'accusation' || card.game_card_type === 'alibi' || card.game_card_type === 'trade' || card.game_card_type === 'revelation'), 'game card agent should emit valid game card types');
    assert(gameCards.every((card) => !('location_ref' in card)), 'game cards should not emit location_ref');
    assert(gameCards.every((card) => [1, 2, 3].includes(card.act)), 'game cards should stay within acts 1-3');
  }

  {
    process.env.SMOKE_MODE = 'true';
    const { gameCardAgent } = await import('../agents/gameCardAgent.js');
    const context = {
      playerCount: 8,
      storyBlurb: 'A mansion murder unfolds over three acts.',
      narratives: {
        a: { suspect: 'Janet Vale' },
        b: { suspect: 'Marco Flint' },
        c: { suspect: 'Sylvia Dunn' }
      },
      case_state: makeCaseState(),
      cards: makeSecrets()
    };

    const result = await gameCardAgent(context);
    const gameCards = result.cards.filter((card) => card.card_type === 'game_card');
    assert(gameCards.length === 40, 'game card agent should scale to five cards per player at larger core sizes');
  }

  console.log('GAME CARD AGENT TEST PASSED');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
