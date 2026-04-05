function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildKnownTerms(context) {
  const suspectNames = new Set();
  for (const suspect of Array.isArray(context?.case_state?.suspects) ? context.case_state.suspects : []) {
    const variants = [
      String(suspect?.name || '').trim(),
      String(suspect?.title || '').trim()
    ].filter(Boolean);
    for (const variant of variants) {
      const normalized = normalizeText(variant);
      if (normalized) {
        suspectNames.add(normalized);
      }
      const base = normalizeText(variant.split(',')[0]?.trim() || '');
      if (base) {
        suspectNames.add(base);
      }
      const firstToken = normalizeText(variant.split(/[,\s]+/)[0] || '');
      if (firstToken) {
        suspectNames.add(firstToken);
      }
    }
  }
  const locationNames = new Set(
    (Array.isArray(context?.cards) ? context.cards : [])
      .filter((card) => card?.card_type === 'location')
      .map((card) => String(card?.card_title || '').trim())
      .filter(Boolean)
      .map(normalizeText)
  );
  const murderLocation = normalizeText(context?.coreTruth?.murder?.location || '');
  if (murderLocation) {
    locationNames.add(murderLocation);
  }
  const treasureObject = normalizeText(context?.coreTruth?.treasure?.object || '');
  return { suspectNames, locationNames, treasureObject };
}

function solutionHasKnownReference(solutionText, knownTerms) {
  const normalized = normalizeText(solutionText);
  if (!normalized) {
    return false;
  }

  for (const suspectName of knownTerms.suspectNames) {
    if (suspectName && normalized.includes(suspectName)) {
      return true;
    }
  }
  for (const locationName of knownTerms.locationNames) {
    if (locationName && normalized.includes(locationName)) {
      return true;
    }
  }
  if (knownTerms.treasureObject && normalized.includes(knownTerms.treasureObject)) {
    return true;
  }

  return false;
}

function assertSolutionReferencesConcreteAnchor(bundleId, solution, context) {
  const knownTerms = buildKnownTerms(context);
  assert(
    solutionHasKnownReference(solution?.card_contents, knownTerms),
    `bundle_structure_validator_agent: bundle ${bundleId} solution must reference suspect or location or object`
  );
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

function isTreasureUnlockCard(card) {
  return card?.card_type === 'treasure'
    || (card?.card_type === 'clue' && String(card?.role || '').trim().toLowerCase() === 'treasure');
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
    const clueEvidenceCards = bundleCards.filter((card) => card.card_type === 'clue');
    const gateCards = bundleCards.filter((card) => card.card_type === 'item');
    const evidenceCards = bundleCards.filter((card) => ['clue', 'item'].includes(card.card_type));

    assert(puzzleCards.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} must have exactly 1 puzzle card`);
    assert(solutionCards.length === 1, `bundle_structure_validator_agent: bundle ${bundleId} must have exactly 1 solution card`);
    assert(clueEvidenceCards.length >= 2, `bundle_structure_validator_agent: bundle ${bundleId} must have at least 2 evidence cards`);
    assert(gateCards.length >= 1, `bundle_structure_validator_agent: bundle ${bundleId} must have at least 1 gate card`);

    const puzzle = puzzleCards[0];
    const solution = solutionCards[0];
    const meta = bundleMeta.get(bundleId) || null;

    assert(puzzle.hidden_until_solved !== true, `bundle_structure_validator_agent: bundle ${bundleId} puzzle must remain visible`);
    for (const evidenceCard of evidenceCards) {
      assert(evidenceCard.hidden_until_solved !== true, `bundle_structure_validator_agent: bundle ${bundleId} evidence must remain visible`);
    }
    assert(solution.hidden_until_solved === true, `bundle_structure_validator_agent: bundle ${bundleId} solution must remain hidden`);
    assert(typeof solution.card_contents === 'string' && solution.card_contents.trim(), `bundle_structure_validator_agent: bundle ${bundleId} solution must have card_contents`);
    assertSolutionReferencesConcreteAnchor(bundleId, solution, context);
    assert(typeof puzzle.puzzle_type === 'string' && puzzle.puzzle_type.trim(), `bundle_structure_validator_agent: bundle ${bundleId} puzzle must have puzzle_type`);
    assert(Array.isArray(puzzle.unlock_card_ids) && puzzle.unlock_card_ids.length >= 1, `bundle_structure_validator_agent: bundle ${bundleId} puzzle must unlock at least one hidden clue`);
    assert(puzzle.unlock_card_ids.includes(solution.card_id), `bundle_structure_validator_agent: bundle ${bundleId} puzzle must unlock its local solution card`);

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

    const treasureUnlocks = (Array.isArray(puzzle.unlock_card_ids) ? puzzle.unlock_card_ids : [])
      .map((id) => (context.cards || []).find((card) => card?.card_id === id))
      .filter(isTreasureUnlockCard);
    if (treasureUnlocks.length) {
      assert(
        String(solution?.meta?.fact_binding || '').trim() === 'treasure_object'
        || String(solution?.meta?.fact_binding || '').trim() === 'treasure_location',
        `bundle_structure_validator_agent: bundle ${bundleId} only treasure-object or treasure-location bundles may unlock treasure cards`
      );
    }

    const normalizedPuzzle = normalizeText(puzzle.card_contents);
    const normalizedSolution = normalizeText(solution.card_contents);
    assert(!normalizedPuzzle.includes(normalizedSolution), `bundle_structure_validator_agent: bundle ${bundleId} puzzle leaks its hidden solution`);
  }

  return context;
}
