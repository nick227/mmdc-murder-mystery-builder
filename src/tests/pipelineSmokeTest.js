let steps;
let getCardsByType;
let getCharacterCards;
let getSolution;
let normalizeContext;
let validateBundleIntegrity;

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

/** Minimal pipeline integrity: ordering runner + cheap corruption guards. Policy-heavy checks belong elsewhere. */
function validateContext(context, stepName) {
  assert(context, `${stepName}: context missing`);

  if (stepName === 'story_blurb_agent') {
    assert(context.storyBlurb, 'storyBlurb missing');
  }

  if (stepName === 'story_metadata_agent') {
    assert(context.story_title, 'story_title missing');
    assert(context.story_description, 'story_description missing');
    assert(context.story_rating, 'story_rating missing');
    assert(context.story_themes, 'story_themes missing');
    assert(getCardsByType(context.cards, 'story_meta').length === 4, 'expected four story_meta cards');
  }

  if (stepName === 'world_building_agent') {
    assert(context.world, 'world missing');
  }

  if (stepName === 'characters_builder_agent') {
    assert(getCharacterCards(context.cards).length === context.playerCount, 'character count mismatch');
  }

  if (stepName === 'core_truth_agent') {
    assert(context.coreTruth, 'coreTruth missing');
    assert(context.coreTruth.murder, 'coreTruth.murder missing');
    assert(context.coreTruth.treasure, 'coreTruth.treasure missing');
    const solution = getSolution(context);
    assert(solution, 'solution should derive from coreTruth');
    assert(solution.killer, 'derived solution.killer missing');
    const solutions = getCardsByType(context.cards, 'solution');
    assert(solutions.length === 2, 'expected two final solution cards');
    assert(solutions.some((c) => c.role === 'murder'), 'missing murder solution card');
    assert(solutions.some((c) => c.role === 'treasure'), 'missing treasure solution card');
  }

  if (stepName === 'core_truth_validator_agent') {
    const solution = getSolution(context);
    assert(solution, 'derived solution missing');
    assert(solution.killer, 'derived solution.killer missing');
  }

  if (stepName === 'character_secret_agent') {
    const chars = getCharacterCards(context.cards);
    const secrets = getCardsByType(context.cards, 'secret');
    assert(secrets.length >= chars.length * 2, 'expected at least two secrets per character');
  }

  if (stepName === 'story_acts_agent') {
    const acts = getCardsByType(context.cards, 'story_act');
    assert(acts.length === 3, 'expected exactly three story_act cards');
    assert(
      acts.every((c) => String(c.card_contents || '').trim().length >= 40),
      'each story_act must have meaningful card_contents'
    );
  }

  if (stepName === 'host_speech_agent') {
    assert(getCardsByType(context.cards, 'host_speech').length >= 3, 'expected at least three host_speech cards');
  }

  if (stepName === 'clue_agent') {
    const clueCards = getCardsByType(context.cards, 'clue');
    assert(clueCards.length >= 8, 'expected at least 8 clue cards');
    for (const clue of clueCards) {
      assert(clue.weight, `murder clue missing weight: ${clue.card_title}`);
    }
  }

  if (stepName === 'bundle_integrity_validator_agent') {
    validateBundleIntegrity(context);
  }

  if (stepName.includes('agent') && context.cards) {
    assert(Array.isArray(context.cards), 'cards not array');
    for (const card of context.cards) {
      assert(card.card_id, `${stepName}: card_id missing`);
    }
  }
}

async function runSmoke() {
  process.env.SMOKE_MODE = 'true';

  ({
    steps
  } = await import('../pipeline/steps/index.js'));
  ({
    getCardsByType,
    getCharacterCards
  } = await import('../utils/cards.js'));
  ({
    getSolution,
    normalizeContext
  } = await import('../utils/context.js'));
  ({
    validateBundleIntegrity
  } = await import('../utils/puzzleBundles.js'));

  let context = normalizeContext({
    playerCount: 4,
    userPrompt: 'Smoke test murder',
    storyStyle: 'Smoke noir',
    cards: []
  });

  console.log('\nRunning pipeline smoke test\n');

  for (const step of steps) {
    const name = step.name;

    try {
      console.log('->', name);

      context = normalizeContext(await step.run(context));

      validateContext(context, name);

      console.log('OK', name);
    } catch (err) {
      console.error('\nFAILED:', name);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log('\nSMOKE TEST PASSED\n');
}

runSmoke()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
