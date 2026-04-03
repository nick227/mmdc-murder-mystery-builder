import { baseName } from '../utils/coreTruthChecks.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function collectBundles(cards) {
  const bundles = new Map();
  for (const card of Array.isArray(cards) ? cards : []) {
    if (!card?.bundle_id) {
      continue;
    }
    if (!bundles.has(card.bundle_id)) {
      bundles.set(card.bundle_id, []);
    }
    bundles.get(card.bundle_id).push(card);
  }
  return bundles;
}

function getSuspectNames(context) {
  const caseStateSuspects = Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : [];
  const names = caseStateSuspects
    .map((suspect) => String(suspect?.name || '').trim())
    .filter(Boolean);

  if (names.length) {
    return names;
  }

  return (Array.isArray(context?.cards) ? context.cards : [])
    .filter((card) => card?.card_type === 'character')
    .map((card) => String(card?.card_title || '').trim())
    .filter(Boolean);
}

function assertBundleSolutionDoesNotNameWrongSuspects(context, solution, bundleId) {
  const killerFull = String(context?.coreTruth?.murder?.killer || '').trim();
  if (!killerFull) {
    return;
  }
  const victimFull = String(context?.coreTruth?.murder?.victim || '').trim();
  const text = normalizeText(solution.card_contents);
  const killerNorm = normalizeText(baseName(killerFull));
  const victimNorm = normalizeText(baseName(victimFull));

  for (const rawName of getSuspectNames(context)) {
    const suspectNorm = normalizeText(baseName(rawName));
    if (!suspectNorm) {
      continue;
    }
    if (suspectNorm === killerNorm || suspectNorm === victimNorm) {
      continue;
    }
    if (text.includes(suspectNorm)) {
      throw new Error(
        `bundle_structure_validator_agent: bundle ${bundleId} solution names suspect "${rawName}" but core truth killer is "${baseName(killerFull)}"`
      );
    }
  }
}

export async function bundleStructureValidatorAgent(context) {
  /* Smoke uses synthetic names/facts that do not satisfy suspect-context heuristics. */
  if (process.env.SMOKE_MODE === 'true') {
    return context;
  }

  context.debug ??= {};
  context.debug.warning_log ??= [];
  const bundles = collectBundles(context.cards);
  const bundleMeta = new Map(
    (Array.isArray(context?.puzzle_bundles) ? context.puzzle_bundles : [])
      .map((bundle) => [bundle.bundle_id, bundle])
  );

  for (const [bundleId, bundleCards] of bundles.entries()) {
    const puzzleCards = bundleCards.filter((card) => card.card_type === 'puzzle');
    const solutionCards = bundleCards.filter((card) => card.card_type === 'solution');
    const evidenceCards = bundleCards.filter((card) => ['clue', 'item'].includes(card.card_type));

    assert(puzzleCards.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} must have exactly 1 puzzle card`);
    assert(solutionCards.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} must have exactly 1 solution card`);
    assert(evidenceCards.length >= 2, `bundle_structure_validator_agent: bundle ${bundleId} must have at least 2 evidence cards`);

    const puzzle = puzzleCards[0];
    const solution = solutionCards[0];
    const meta = bundleMeta.get(bundleId) || null;

    assert(puzzle.hidden_until_solved !== true, `bundle_structure_validator_agent: bundle ${bundleId} puzzle must remain visible`);
    for (const evidenceCard of evidenceCards) {
      assert(evidenceCard.hidden_until_solved !== true, `bundle_structure_validator_agent: bundle ${bundleId} evidence must remain visible`);
    }
    assert(solution.hidden_until_solved === true, `bundle_structure_validator_agent: bundle ${bundleId} solution must remain hidden`);
    assert(typeof solution.card_contents === 'string' && solution.card_contents.trim(), `bundle_structure_validator_agent: bundle ${bundleId} solution must have card_contents`);
    assert(typeof puzzle.puzzle_type === 'string' && puzzle.puzzle_type.trim(), `bundle_structure_validator_agent: bundle ${bundleId} puzzle must have puzzle_type`);
    assert(Array.isArray(puzzle.unlock_card_ids) && puzzle.unlock_card_ids.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} puzzle must unlock exactly one hidden clue`);

    assertBundleSolutionDoesNotNameWrongSuspects(context, solution, bundleId);

    if (meta) {
      assert(
        meta.puzzle_type === puzzle.puzzle_type,
        `bundle_structure_validator_agent: bundle ${bundleId} puzzle_type metadata drift`
      );
      assert(
        meta.act === puzzle.act,
        `bundle_structure_validator_agent: bundle ${bundleId} act metadata drift`
      );
      if (meta.clue_target) {
        assert(
          solution.card_contents === meta.clue_target,
          `bundle_structure_validator_agent: bundle ${bundleId} hidden clue must match selected clue target`
        );
      }
    }

    const normalizedPuzzle = normalizeText(puzzle.card_contents);
    const normalizedSolution = normalizeText(solution.card_contents);
    assert(!normalizedPuzzle.includes(normalizedSolution), `bundle_structure_validator_agent: bundle ${bundleId} puzzle leaks its hidden solution`);
  }

  return context;
}
