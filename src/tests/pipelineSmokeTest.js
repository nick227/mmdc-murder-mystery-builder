import { steps } from '../pipeline/steps/index.js';
import { getCardsByType, getCharacterCards } from '../utils/cards.js';
import { normalizeContext } from '../utils/context.js';
import { validateBundleIntegrity } from '../utils/puzzleBundles.js';

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

  if (stepName === 'murder_truth_agent') {
    assert(context.murder_truth, 'murder_truth missing');
  }

  if (stepName === 'fortune_truth_agent') {
    assert(context.fortune_truth, 'fortune_truth missing');
  }

  if (stepName === 'solution_assembler_agent') {
    assert(context.solution, 'solution missing');
    assert(context.solution.killer, 'solution.killer missing');
    assert(context.solution.method, 'solution.method missing');
    assert(context.solution.location, 'solution.location missing');
    assert(context.solution.motive, 'solution.motive missing');
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

  if (stepName === 'puzzle_agent') {
    const puzzleCards = getCardsByType(context.cards, 'puzzle');
    const puzzleBundles = context.puzzle_bundles || [];
    const cardIds = new Set((context.cards || []).map((card) => card.card_id));

    assert(puzzleBundles.length === 4, 'expected 4 puzzle bundles');
    assert(puzzleCards.length === puzzleBundles.length, 'expected one puzzle card per bundle');

    for (const bundle of puzzleBundles) {
      assert(bundle.bundle_id, 'puzzle bundle missing bundle_id');
      assert(bundle.actionable_gain, `puzzle bundle ${bundle.bundle_id} missing actionable_gain`);

      const bundleCards = (context.cards || []).filter((card) => card.bundle_id === bundle.bundle_id);
      const bundlePuzzleCards = bundleCards.filter((card) => card.card_type === 'puzzle');
      const bundleNonPuzzleCards = bundleCards.filter((card) => card.card_type !== 'puzzle');
      const hiddenBundleCards = bundleNonPuzzleCards.filter((card) => card.hidden_until_solved === true);

      assert(bundlePuzzleCards.length === 1, `bundle ${bundle.bundle_id} must emit exactly one puzzle card`);
      assert(bundleNonPuzzleCards.length >= 2, `bundle ${bundle.bundle_id} must emit at least two non-puzzle cards`);

      const puzzle = bundlePuzzleCards[0];
      assert(Array.isArray(puzzle.required_card_ids), `bundle ${bundle.bundle_id} puzzle missing required_card_ids`);
      assert(puzzle.required_card_ids.length >= 2, `bundle ${bundle.bundle_id} puzzle must require at least two cards`);
      assert(Array.isArray(puzzle.unlock_card_ids), `bundle ${bundle.bundle_id} puzzle missing unlock_card_ids`);
      assert(puzzle.unlock_card_ids.length >= 1, `bundle ${bundle.bundle_id} puzzle must unlock at least one card`);
      assert(!puzzle.required_card_ids.includes(puzzle.card_id), `bundle ${bundle.bundle_id} puzzle cannot require itself`);

      for (const requiredId of puzzle.required_card_ids) {
        assert(cardIds.has(requiredId), `bundle ${bundle.bundle_id} required card missing from output`);
        assert(!hiddenBundleCards.some((card) => card.card_id === requiredId), `bundle ${bundle.bundle_id} cannot require hidden cards`);
      }
      for (const unlockId of puzzle.unlock_card_ids || []) {
        assert(cardIds.has(unlockId), `bundle ${bundle.bundle_id} unlock card missing from output`);
        assert(bundleCards.some((card) => card.card_id === unlockId), `bundle ${bundle.bundle_id} unlock card must be in the bundle`);
        assert(hiddenBundleCards.some((card) => card.card_id === unlockId), `bundle ${bundle.bundle_id} unlock card must be hidden`);
      }

      if (puzzle.difficulty === 'hard') {
        const unlockClues = bundleCards.filter((card) => card.card_type === 'clue' && puzzle.unlock_card_ids.includes(card.card_id));
        for (const clue of unlockClues) {
          assert(clue.evidence_strength === 'strong', `bundle ${bundle.bundle_id} hard puzzle should unlock strong clues`);
        }
      }
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
