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
  }

  if (stepName === 'core_truth_validator_agent') {
    const solution = getSolution(context);
    assert(solution, 'derived solution missing');
    assert(solution.killer, 'derived solution.killer missing');
  }

  if (stepName === 'clue_agent') {
    const clueCards = getCardsByType(context.cards, 'clue');
    assert(clueCards.length >= 8, 'expected at least 8 clue cards');
    for (const clue of clueCards) {
      if (clue.bundle_id || clue.clue_type === 'treasure') {
        continue;
      }
      assert(clue.clue_type, `murder clue missing clue_type: ${clue.card_title}`);
    }
  }

  if (stepName === 'bundle_finalize_agent') {
    const puzzleCards = getCardsByType(context.cards, 'puzzle');
    const puzzleBundles = context.puzzle_bundles || [];

    assert(puzzleBundles.length >= 1, 'expected at least one puzzle bundle');
    assert(puzzleCards.length === puzzleBundles.length, 'expected one puzzle card per bundle');

    const allRefs = new Set((context.cards || []).map((card) => card.card_ref).filter(Boolean));

    for (const bundle of puzzleBundles) {
      assert(bundle.bundle_id, 'puzzle bundle missing bundle_id');

      const bundleCards = (context.cards || []).filter((card) => card.bundle_id === bundle.bundle_id);
      const bundlePuzzleCards = bundleCards.filter((card) => card.card_type === 'puzzle');
      const bundleNonPuzzle = bundleCards.filter((card) => card.card_type !== 'puzzle');
      const hiddenSolutionCards = bundleNonPuzzle.filter(
        (card) => card.hidden_until_solved === true && card.card_type === 'solution'
      );

      assert(bundlePuzzleCards.length === 1, `bundle ${bundle.bundle_id} must emit exactly one puzzle card`);
      assert(bundleCards.length >= 2, `bundle ${bundle.bundle_id} must emit at least two cards`);
      assert(hiddenSolutionCards.length === 1, `bundle ${bundle.bundle_id} must emit exactly one hidden solution card`);

      const puzzle = bundlePuzzleCards[0];
      assert(Array.isArray(puzzle.required_card_refs), `bundle ${bundle.bundle_id} puzzle missing required_card_refs`);
      assert(Array.isArray(puzzle.unlock_card_refs), `bundle ${bundle.bundle_id} puzzle missing unlock_card_refs`);
      assert(Array.isArray(puzzle.required_card_ids), `bundle ${bundle.bundle_id} puzzle missing required_card_ids`);
      assert(Array.isArray(puzzle.unlock_card_ids), `bundle ${bundle.bundle_id} puzzle missing unlock_card_ids`);
      assert(puzzle.required_card_ids.length >= 1, `bundle ${bundle.bundle_id} puzzle must resolve required_card_ids`);

      const bundleRefs = new Set(bundleCards.map((card) => card.card_ref).filter(Boolean));
      for (const requiredRef of puzzle.required_card_refs) {
        assert(allRefs.has(requiredRef), `bundle ${bundle.bundle_id} required card_ref missing from output`);
      }
      for (const unlockRef of puzzle.unlock_card_refs) {
        assert(bundleRefs.has(unlockRef), `bundle ${bundle.bundle_id} unlock card_ref missing from output`);
      }
    }
  }

  if (stepName === 'suspect_coverage_agent') {
    assert(context.suspect_coverage, 'suspect_coverage missing');
    assert(Array.isArray(context.suspect_coverage.issues), 'suspect_coverage issues missing');
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
