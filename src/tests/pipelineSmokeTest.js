let steps;
let getCardsByType;
let getCharacterCards;
let getSolution;
let normalizeContext;
let validateBundleIntegrity;

const trailRoleToAct = {
  red_herring: 1,
  ambiguous: 2,
  killer_aligned: 3
};

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

function validateContext(context, stepName) {
  assert(context, `${stepName}: context missing`);

  if (stepName === 'story_blurb_agent') {
    assert(context.storyBlurb, 'storyBlurb missing');
  }

  if (stepName === 'world_building_agent') {
    assert(context.world, 'world missing');
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
    assert(solution.method, 'derived solution.method missing');
    assert(solution.location, 'derived solution.location missing');
    assert(solution.motive, 'derived solution.motive missing');
  }

  if (stepName === 'case_state_builder_agent') {
    assert(context.case_state, 'case_state missing');
    assert(Array.isArray(context.case_state.suspects), 'case_state suspects missing');
    assert(context.case_state.suspects.length === context.playerCount, 'case_state suspect count mismatch');
    assert(context.case_state.killer_id, 'case_state killer_id missing');
    assert(Array.isArray(context.case_state.state_progression.viable_suspects), 'case_state viable_suspects missing');
  }

  if (stepName === 'trail_review_agent') {
    assert(context.trail_review, 'trail_review missing');
    assert(context.trail_review.pass === true, 'trail_review.pass must be true');
    assert(context.trail_review.roles.red_herring === true, 'trail_review.roles.red_herring must be true');
    assert(context.trail_review.roles.killer_aligned === true, 'trail_review.roles.killer_aligned must be true');
    assert(context.trail_review.roles.ambiguous === true, 'trail_review.roles.ambiguous must be true');
  }

  if (stepName === 'narrative_validator_agent') {
    assert(context.narrative_validation, 'narrative_validation missing');
    assert(context.narrative_validation.pass === true, 'narrative_validation.pass must be true');
  }

  if (stepName === 'ambiguity_balancer_agent') {
    assert(context.ambiguity_balancer_skipped === true, 'ambiguity balancer should skip after passing structured validators');
    assert(context.ambiguity_notes == null, 'ambiguity_notes should be empty when balancer is skipped');
  }

  if (stepName === 'clue_agent') {
    const clueCards = getCardsByType(context.cards, 'clue');
    assert(clueCards.length >= 8, 'expected at least 8 clue cards');

    for (const clue of clueCards) {
      if (clue.bundle_id) {
        continue;
      }
      assert(clue.trail_role, `clue missing trail_role: ${clue.card_title}`);
      assert(trailRoleToAct[clue.trail_role] === clue.act, `clue act mismatch: ${clue.card_title}`);
    }
  }

  if (stepName === 'structural_preflight_agent') {
    assert(context.structural_preflight, 'structural_preflight missing');
    assert(Array.isArray(context.structural_preflight.issues), 'structural_preflight issues missing');
  }

  if (stepName === 'suspect_coverage_agent') {
    assert(context.suspect_coverage, 'suspect_coverage missing');
    assert(Array.isArray(context.suspect_coverage.issues), 'suspect_coverage issues missing');
  }

  if (stepName === 'puzzle_agent') {
    const puzzleCards = getCardsByType(context.cards, 'puzzle');
    const puzzleBundles = context.puzzle_bundles || [];

    assert(puzzleBundles.length === 4, 'expected 4 puzzle bundles');
    assert(puzzleCards.length === puzzleBundles.length, 'expected one puzzle card per bundle');

    for (const bundle of puzzleBundles) {
      assert(bundle.bundle_id, 'puzzle bundle missing bundle_id');

      const bundleCards = (context.cards || []).filter((card) => card.bundle_id === bundle.bundle_id);
      const bundlePuzzleCards = bundleCards.filter((card) => card.card_type === 'puzzle');
      const bundleNonPuzzleCards = bundleCards.filter((card) => card.card_type !== 'puzzle');
      const hiddenBundleCards = bundleNonPuzzleCards.filter((card) => card.hidden_until_solved === true);
      const hiddenSolutionCards = hiddenBundleCards.filter((card) => card.card_type === 'solution');

      assert(bundlePuzzleCards.length === 1, `bundle ${bundle.bundle_id} must emit exactly one puzzle card`);
      assert(bundleCards.length >= 2, `bundle ${bundle.bundle_id} must emit at least two cards`);
      assert(bundleNonPuzzleCards.length >= 1, `bundle ${bundle.bundle_id} must emit at least one non-puzzle card`);

      const puzzle = bundlePuzzleCards[0];
      assert(Array.isArray(puzzle.required_card_refs), `bundle ${bundle.bundle_id} puzzle missing required_card_refs`);
      assert(Array.isArray(puzzle.unlock_card_refs), `bundle ${bundle.bundle_id} puzzle missing unlock_card_refs`);
      assert(Array.isArray(puzzle.required_card_ids), `bundle ${bundle.bundle_id} puzzle missing required_card_ids`);
      assert(Array.isArray(puzzle.unlock_card_ids), `bundle ${bundle.bundle_id} puzzle missing unlock_card_ids`);
      assert(puzzle.required_card_ids.length >= 1, `bundle ${bundle.bundle_id} puzzle must resolve required_card_ids`);
      assert(typeof puzzle.solve_instructions === 'string' && puzzle.solve_instructions.trim(), `bundle ${bundle.bundle_id} puzzle missing solve_instructions`);
      assert(hiddenSolutionCards.length === 1, `bundle ${bundle.bundle_id} must emit exactly one hidden solution card`);
      assert(hiddenSolutionCards[0].hidden_until_solved === true, `bundle ${bundle.bundle_id} solution card must remain hidden`);
      assert(!puzzle.required_card_refs.includes(puzzle.card_ref), `bundle ${bundle.bundle_id} puzzle should not self-reference required_card_refs`);
      assert(!puzzle.unlock_card_refs.includes(puzzle.card_ref), `bundle ${bundle.bundle_id} puzzle should not self-reference unlock_card_refs`);

      const bundleRefs = new Set(bundleCards.map((card) => card.card_ref).filter(Boolean));
      const allRefs = new Set((context.cards || []).map((card) => card.card_ref).filter(Boolean));
      for (const requiredRef of puzzle.required_card_refs) {
        assert(allRefs.has(requiredRef), `bundle ${bundle.bundle_id} required card_ref missing from output`);
      }
      for (const unlockRef of puzzle.unlock_card_refs) {
        assert(bundleRefs.has(unlockRef), `bundle ${bundle.bundle_id} unlock card_ref missing from output`);
      }
      assert(bundleCards[bundleCards.length - 1]?.card_type === 'puzzle', `bundle ${bundle.bundle_id} must emit puzzle card last`);
      if (puzzle.unlock_card_ids.length === 0) {
        assert(
          hiddenBundleCards.length === hiddenSolutionCards.length,
          `bundle ${bundle.bundle_id} hidden unlock count mismatch`
        );
      } else {
        assert(hiddenBundleCards.length === puzzle.unlock_card_ids.length, `bundle ${bundle.bundle_id} hidden unlock count mismatch`);
      }
    }
  }

  if (stepName === 'evidence_canonicalizer_agent') {
    const evidenceCards = (context.cards || []).filter((card) => ['clue', 'item'].includes(card.card_type) && !card.bundle_id);
    assert(evidenceCards.length >= 1, 'expected evidence cards before canonicalization validation');
    for (const card of evidenceCards) {
      assert(Array.isArray(card.derived_facts), `evidence card missing derived_facts: ${card.card_title}`);
    }
  }

  if (stepName === 'characters_builder_agent') {
    assert(getCharacterCards(context.cards).length === context.playerCount, 'character count mismatch');
  }

  if (stepName === 'bundle_integrity_validator_agent') {
    validateBundleIntegrity(context);
  }

  if (stepName === 'character_secret_agent') {
    assert(getCardsByType(context.cards, 'secret').length >= getCharacterCards(context.cards).length, 'secret coverage mismatch');
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
