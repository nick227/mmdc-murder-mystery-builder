import { buildGameCardsPromptForPlayer } from '../prompts/gameCardsPrompt.js';
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

function makeCaseStateEight() {
  return {
    killer_name: 'Janet Vale',
    suspects: [
      ...makeCaseState().suspects,
      { suspect_id: 'nia_ross', card_id: 'char-5', name: 'Nia Ross', title: 'Nia Ross, The DJ', is_killer: false },
      { suspect_id: 'leo_vance', card_id: 'char-6', name: 'Leo Vance', title: 'Leo Vance, Security', is_killer: false },
      { suspect_id: 'ada_wu', card_id: 'char-7', name: 'Ada Wu', title: 'Ada Wu, Coat Check', is_killer: false },
      { suspect_id: 'ben_knox', card_id: 'char-8', name: 'Ben Knox', title: 'Ben Knox, The Regular', is_killer: false }
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
    const prompt = buildGameCardsPromptForPlayer({
      storyBlurb: 'A nightclub murder unfolds over three acts.',
      characterName: 'Janet Vale',
      characterRole: 'The Club Manager',
      characterBio: 'Runs the VIP list and knows every regular by drink order.',
      playerIndex: 0,
      playerCount: 4,
      rejectionReasons: []
    });

    assert(prompt.user.includes('Write exactly 5 game cards'), 'per-player prompt should ask for five cards');
    assert(prompt.user.includes('Janet Vale'), 'prompt should name the focal character');
    assert(prompt.user.includes('The Club Manager'), 'prompt should include role');
    assert(prompt.user.includes('VIP list'), 'prompt should include bio');
    assert(prompt.user.includes('Story: A nightclub murder'), 'prompt should include story blurb in one line');
    assert(!prompt.user.includes('Killer identity:'), 'prompt should not dump killer block');
    assert(!prompt.user.includes('Character secrets:'), 'prompt should not dump secrets roster');
    assert(prompt.system.includes('improvisation'), 'system should emphasize live play');
  }

  {
    assert(!actedCardSchema.required.includes('location_ref'), 'acted card schema should not require location_ref');
    assert(!('location_ref' in actedCardSchema.properties), 'acted card schema should not expose location_ref');
    assert(!actedCardSchema.required.includes('act'), 'acted card schema should not require act');
    assert(!('act' in actedCardSchema.properties), 'acted card schema should not expose act');
    assert(!('game_card_type' in actedCardSchema.properties), 'acted card schema should not expose game_card_type');
  }

  {
    process.env.SMOKE_MODE = 'true';
    const { gameCardAgent } = await import('../agents/gameCardAgent.js');
    const context = {
      playerCount: 4,
      storyBlurb: 'A nightclub murder unfolds over three acts.',
      narratives: {
        a: { suspect: 'Janet Vale', claim: 'Janet was counting receipts at the bar.' },
        b: { suspect: 'Marco Flint', claim: 'Marco was polishing glasses.' },
        c: { suspect: 'Sylvia Dunn' }
      },
      case_state: makeCaseState(),
      cards: makeSecrets()
    };

    const result = await gameCardAgent(context);
    const gameCards = result.cards.filter((card) => card.card_type === 'game_card');

    assert(gameCards.length === 20, 'game card agent should generate five cards per player');
    assert(gameCards.every((card) => !('location_ref' in card)), 'game cards should not emit location_ref');
    assert(gameCards.every((card) => !('act' in card)), 'game cards should not emit act');
    assert(gameCards.every((card) => !('game_card_type' in card)), 'game cards should not emit game_card_type');
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
      case_state: makeCaseStateEight(),
      cards: makeSecrets()
    };

    const result = await gameCardAgent(context);
    const gameCards = result.cards.filter((card) => card.card_type === 'game_card');
    assert(gameCards.length === 40, 'game card agent should scale to five cards per player when roster has eight suspects');
  }

  console.log('GAME CARD AGENT TEST PASSED');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
